import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ConversationItem {
  id: string;
  sessionId: string;
  participantName: string;
  participantId: string;
  participantRole: 'student' | 'admin';
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
  status: 'active' | 'waiting' | 'ended';
  complaintId: string | null;
}

export const useConversations = (userId: string | undefined, userRole: 'student' | 'admin') => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    fetchConversations();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_sessions',
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, userRole]);

  const fetchConversations = async () => {
    if (!userId) return;

    setLoading(true);

    try {
      // Fetch sessions based on user role
      const query = supabase
        .from('chat_sessions')
        .select('*')
        .order('updated_at', { ascending: false });

      if (userRole === 'student') {
        query.eq('student_id', userId);
      } else {
        // Admin sees all sessions they're part of or waiting sessions
        query.or(`admin_id.eq.${userId},status.eq.waiting`);
      }

      const { data: sessions, error: sessionsError } = await query;

      if (sessionsError) throw sessionsError;

      // Fetch profiles for participant info
      const participantIds = sessions?.map((s) =>
        userRole === 'student' ? s.admin_id : s.student_id
      ).filter(Boolean) || [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', participantIds);

      const profilesMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      // Get unread counts
      const unreadCounts = await Promise.all(
        (sessions || []).map(async (session) => {
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id)
            .is('read_at', null)
            .neq('sender_id', userId);

          return { sessionId: session.id, count: count || 0 };
        })
      );

      const unreadMap = new Map(unreadCounts.map((u) => [u.sessionId, u.count]));

      const formatted: ConversationItem[] = (sessions || []).map((session) => {
        const participantId = userRole === 'student' ? session.admin_id : session.student_id;
        const profile = profilesMap.get(participantId || '');

        return {
          id: session.id,
          sessionId: session.id,
          participantName: profile?.name || (userRole === 'student' ? 'Admin' : 'Student'),
          participantId: participantId || '',
          participantRole: userRole === 'student' ? 'admin' : 'student',
          lastMessage: session.last_message || null,
          lastMessageTime: session.last_message_at || session.updated_at,
          unreadCount: unreadMap.get(session.id) || 0,
          status: session.status as 'active' | 'waiting' | 'ended',
          complaintId: session.complaint_id,
        };
      });

      setConversations(formatted);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    conversations,
    loading,
    refreshConversations: fetchConversations,
  };
};
