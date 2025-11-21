import { useState, useRef, useEffect } from 'react';
import { X, Send, Monitor, Mic, MicOff, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useChatSession, ChatSession } from '@/hooks/useChatSession';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import ScreenShareDisplay from './ScreenShareDisplay';

interface ChatWindowProps {
  session: ChatSession;
  onClose: () => void;
}

const ChatWindow = ({ session, onClose }: ChatWindowProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { messages, sending, sendMessage, uploadFile } = useChatMessages(session.id, user?.id);
  const { endSession } = useChatSession(user?.id, session.student_id === user?.id ? 'student' : 'admin');
  
  const isStudent = session.student_id === user?.id;
  const {
    connectionState,
    localStream,
    remoteStream,
    isScreenSharing,
    isAudioEnabled,
    startScreenShare,
    stopScreenShare,
    toggleAudio,
  } = useWebRTC(session.id, user?.id, isStudent);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || sending) return;
    
    await sendMessage(message);
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileUrl = await uploadFile(file);
    if (fileUrl) {
      await sendMessage(`Shared file: ${file.name}`, 'file', fileUrl);
    }
  };

  const handleEndChat = async () => {
    await endSession(session.id);
    onClose();
  };

  const getStatusColor = () => {
    if (session.status === 'active') return 'bg-green-500';
    if (session.status === 'waiting') return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  return (
    <Card className={cn(
      "fixed flex flex-col shadow-2xl z-50 bg-background border-border rounded-lg",
      // Mobile: full width with margins, max 80vh height
      "bottom-4 left-4 right-4 max-h-[80vh]",
      // Desktop: fixed size in bottom-right
      "md:bottom-8 md:left-auto md:right-8 md:w-[400px] md:h-[600px]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          <h3 className="font-semibold text-foreground">
            {session.status === 'waiting' ? 'Waiting for admin...' : 'Live Chat'}
          </h3>
          {connectionState === 'connected' && (
            <Badge variant="outline" className="text-xs">Connected</Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Mobile Warning for Screen Share */}
      {isMobile && session.status === 'active' && (
        <div className="px-4 py-2 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs border-b border-border">
          ⚠️ Screen sharing may not be available on mobile devices
        </div>
      )}

      {/* Screen Share Display */}
      {(localStream || remoteStream) && (
        <ScreenShareDisplay
          localStream={localStream}
          remoteStream={remoteStream}
          isScreenSharing={isScreenSharing}
        />
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => {
            const isOwn = msg.sender_id === user?.id;
            const isSystem = msg.message_type === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <Badge variant="secondary" className="text-xs">
                    {msg.message}
                  </Badge>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    isOwn
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {msg.message_type === 'file' && msg.file_url ? (
                    <a
                      href={msg.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:no-underline"
                    >
                      {msg.message}
                    </a>
                  ) : (
                    <p className="text-sm">{msg.message}</p>
                  )}
                  <span className="text-xs opacity-70 mt-1 block">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Controls */}
      <div className="p-4 border-t border-border space-y-2">
        {/* WebRTC Controls - Hide screen share on mobile */}
        {session.status === 'active' && !isMobile && (
          <div className="flex gap-2 mb-2">
            <Button
              size="sm"
              variant={isScreenSharing ? 'default' : 'outline'}
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              className="flex-1 min-h-[44px]"
            >
              <Monitor className="h-4 w-4 mr-2" />
              {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
            </Button>
            <Button
              size="sm"
              variant={isAudioEnabled ? 'default' : 'outline'}
              onClick={toggleAudio}
              className="min-h-[44px] min-w-[44px]"
            >
              {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
          </div>
        )}
        
        {/* Audio-only control on mobile */}
        {session.status === 'active' && isMobile && (
          <div className="flex gap-2 mb-2">
            <Button
              size="sm"
              variant={isAudioEnabled ? 'default' : 'outline'}
              onClick={toggleAudio}
              className="flex-1 min-h-[44px]"
            >
              {isAudioEnabled ? <Mic className="h-4 w-4 mr-2" /> : <MicOff className="h-4 w-4 mr-2" />}
              {isAudioEnabled ? 'Mute' : 'Unmute'}
            </Button>
          </div>
        )}

        {/* Message Input */}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            size="icon"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] min-w-[44px]"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 min-h-[44px] text-base"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={sending || !message.trim()}
            className="min-h-[44px] min-w-[44px]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* End Chat Button */}
        <Button
          variant="destructive"
          size="sm"
          onClick={handleEndChat}
          className="w-full"
        >
          End Chat
        </Button>
      </div>
    </Card>
  );
};

export default ChatWindow;
