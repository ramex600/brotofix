import { useEffect, useState } from 'react';
import { MessageCircle, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useChatSession } from '@/hooks/useChatSession';
import ChatWindow from './ChatWindow';

interface WaitingSession {
  id: string;
  student_id: string;
  status: string;
  created_at: string;
  profiles: {
    name: string;
    student_id: string;
  } | null;
}

const AdminChatQueue = () => {
  const { user } = useAuth();
  const [waitingSessions, setWaitingSessions] = useState<WaitingSession[]>([]);
  const { activeSession, joinSession } = useChatSession(user?.id, 'admin');
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (!user) return;

    fetchWaitingSessions();

    // Subscribe to new chat requests
    const channel = supabase
      .channel('waiting-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_sessions',
          filter: 'status=eq.waiting',
        },
        () => {
          fetchWaitingSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchWaitingSessions = async () => {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching waiting sessions:', error);
      return;
    }

    // Fetch student profiles separately
    const sessionsWithProfiles = await Promise.all(
      (data || []).map(async (session) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, student_id')
          .eq('id', session.student_id)
          .maybeSingle();

        return {
          ...session,
          profiles: profile,
        };
      })
    );

    setWaitingSessions(sessionsWithProfiles);
  };

  const handleJoinSession = async (sessionId: string) => {
    const session = await joinSession(sessionId);
    if (session) {
      setShowChat(true);
    }
  };

  if (showChat && activeSession) {
    return <ChatWindow session={activeSession} onClose={() => setShowChat(false)} />;
  }

  if (waitingSessions.length === 0 && !activeSession) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Live Chat Queue
          {waitingSessions.length > 0 && (
            <Badge variant="destructive">{waitingSessions.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Active Session */}
        {activeSession && (
          <Card className="mb-4 border-green-500 border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <div>
                    <p className="font-semibold">Active Chat</p>
                    <p className="text-sm text-muted-foreground">
                      Session in progress
                    </p>
                  </div>
                </div>
                <Button onClick={() => setShowChat(true)} size="sm">
                  Open Chat
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Waiting Sessions */}
        {waitingSessions.length > 0 ? (
          <div className="space-y-3">
            {waitingSessions.map((session) => (
              <Card key={session.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <User className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">
                          {session.profiles?.name || 'Unknown Student'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {session.profiles?.student_id || 'No ID'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Waiting for{' '}
                          {Math.floor(
                            (Date.now() - new Date(session.created_at).getTime()) / 60000
                          )}{' '}
                          minutes
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleJoinSession(session.id)}
                      disabled={!!activeSession}
                    >
                      Join Chat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          !activeSession && (
            <p className="text-center text-muted-foreground py-4">
              No students waiting for chat
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
};

export default AdminChatQueue;
