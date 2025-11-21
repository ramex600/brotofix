import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChatSession {
  id: string;
  student_id: string;
  admin_id: string | null;
  status: 'waiting' | 'active' | 'ended';
  complaint_id: string | null;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

export const useChatSession = (userId: string | undefined, userRole: 'student' | 'admin') => {
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    // Fetch active session on mount
    fetchActiveSession();

    // Subscribe to session changes
    const channel = supabase
      .channel(`chat-session-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_sessions',
          filter: userRole === 'student' 
            ? `student_id=eq.${userId}`
            : `admin_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Chat session change:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const session = payload.new as ChatSession;
            if (session.status !== 'ended') {
              setActiveSession(session);
            } else {
              setActiveSession(null);
            }
          } else if (payload.eventType === 'DELETE') {
            setActiveSession(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, userRole]);

  const fetchActiveSession = async () => {
    if (!userId) return;

    try {
      const query = supabase
        .from('chat_sessions')
        .select('*')
        .neq('status', 'ended')
        .order('created_at', { ascending: false })
        .limit(1);

      if (userRole === 'student') {
        query.eq('student_id', userId);
      } else {
        query.eq('admin_id', userId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('Error fetching active session:', error);
        return;
      }

      setActiveSession(data);
    } catch (error) {
      console.error('Error in fetchActiveSession:', error);
    }
  };

  const createSession = async (complaintId?: string, targetStudentId?: string) => {
    if (!userId) {
      toast({
        title: 'Error',
        description: 'You must be logged in to start a chat',
        variant: 'destructive',
      });
      return null;
    }

    setLoading(true);

    try {
      // If admin is creating a session with a student
      const sessionData = targetStudentId
        ? {
            student_id: targetStudentId,
            admin_id: userId,
            status: 'active' as const,
            complaint_id: complaintId || null,
          }
        : {
            student_id: userId,
            status: 'waiting' as const,
            complaint_id: complaintId || null,
          };

      const { data, error } = await supabase
        .from('chat_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) throw error;

      setActiveSession(data);
      
      toast({
        title: targetStudentId ? 'Chat Started' : 'Chat Request Sent',
        description: targetStudentId
          ? 'Chat session created successfully'
          : 'Waiting for an admin to join...',
      });

      return data;
    } catch (error: any) {
      console.error('Error creating session:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create chat session',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const joinSession = async (sessionId: string) => {
    if (!userId) return null;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .update({
          admin_id: userId,
          status: 'active',
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;

      // Send system message
      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        sender_id: userId,
        message: 'Admin has joined the chat',
        message_type: 'system',
      });

      setActiveSession(data);
      
      toast({
        title: 'Joined Chat',
        description: 'You are now connected with the student',
      });

      return data;
    } catch (error: any) {
      console.error('Error joining session:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to join chat session',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const endSession = async (sessionId: string) => {
    if (!userId) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('chat_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;

      // Send system message
      await supabase.from('chat_messages').insert({
        session_id: sessionId,
        sender_id: userId,
        message: 'Chat session has ended',
        message_type: 'system',
      });

      setActiveSession(null);
      
      toast({
        title: 'Chat Ended',
        description: 'The chat session has been closed',
      });
    } catch (error: any) {
      console.error('Error ending session:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to end chat session',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    activeSession,
    loading,
    createSession,
    joinSession,
    endSession,
    refreshSession: fetchActiveSession,
  };
};
