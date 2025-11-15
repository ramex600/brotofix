import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useChatSession } from '@/hooks/useChatSession';
import { useAuth } from '@/hooks/useAuth';
import ChatWindow from './ChatWindow';

const LiveChatButton = () => {
  const { user } = useAuth();
  const { activeSession, createSession, loading } = useChatSession(user?.id, 'student');
  const [isOpen, setIsOpen] = useState(false);

  const handleStartChat = async () => {
    if (activeSession) {
      setIsOpen(true);
    } else {
      const session = await createSession();
      if (session) {
        setIsOpen(true);
      }
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  if (isOpen && activeSession) {
    return <ChatWindow session={activeSession} onClose={handleClose} />;
  }

  return (
    <Button
      onClick={handleStartChat}
      disabled={loading}
      className="fixed bottom-24 right-8 h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white z-50"
      size="icon"
    >
      {loading ? (
        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
      ) : (
        <MessageCircle className="h-6 w-6" />
      )}
    </Button>
  );
};

export default LiveChatButton;
