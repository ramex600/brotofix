import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  session_id: string;
  sender_id: string;
  message: string;
  message_type: 'text' | 'system' | 'file';
  file_url: string | null;
  created_at: string;
  read_at: string | null;
  read_by: string | null;
}

export const useChatMessages = (sessionId: string | undefined, userId: string | undefined) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    // Fetch existing messages
    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat-messages-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log('New message:', payload.new);
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const fetchMessages = async () => {
    if (!sessionId) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (message: string, messageType: 'text' | 'system' | 'file' = 'text', fileUrl?: string) => {
    if (!sessionId || !userId || !message.trim()) return;

    setSending(true);

    try {
      const { error } = await supabase.from('chat_messages').insert({
        session_id: sessionId,
        sender_id: userId,
        message: message.trim(),
        message_type: messageType,
        file_url: fileUrl || null,
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!sessionId || !userId) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${sessionId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('complaint-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('complaint-files')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload file',
        variant: 'destructive',
      });
      return null;
    }
  };

  return {
    messages,
    loading,
    sending,
    sendMessage,
    uploadFile,
    refreshMessages: fetchMessages,
  };
};
