import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Send, Paperclip, Monitor, Mic, MicOff, ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConversationsList } from './ConversationsList';
import { StudentSelector } from './StudentSelector';
import { MessageBubble } from './MessageBubble';
import { useChatMessages } from '@/hooks/useChatMessages';
import { useChatSession } from '@/hooks/useChatSession';
import { useWebRTC } from '@/hooks/useWebRTC';
import ScreenShareDisplay from './ScreenShareDisplay';
import { cn } from '@/lib/utils';

interface ChatInterfaceProps {
  userRole: 'student' | 'admin';
}

export const ChatInterface = ({ userRole }: ChatInterfaceProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>();
  const [message, setMessage] = useState('');
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { activeSession, createSession, joinSession, endSession } = useChatSession(
    user?.id,
    userRole
  );
  
  const { messages, sending, sendMessage, uploadFile } = useChatMessages(
    selectedSessionId,
    user?.id
  );

  const isStudent = userRole === 'student';
  const {
    localStream,
    remoteStream,
    isScreenSharing,
    isAudioEnabled,
    startScreenShare,
    stopScreenShare,
    toggleAudio,
  } = useWebRTC(selectedSessionId, user?.id, isStudent);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (selectedSessionId && messages.length > 0) {
      // Mark messages as read
      markMessagesAsRead();
    }
  }, [selectedSessionId, messages]);

  const markMessagesAsRead = async () => {
    if (!selectedSessionId || !user) return;
    
    const unreadMessages = messages.filter(
      (msg) => msg.sender_id !== user.id && !msg.read_at
    );

    // Update all unread messages
    for (const msg of unreadMessages) {
      await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString(), read_by: user.id })
        .eq('id', msg.id);
    }
  };

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
    if (!selectedSessionId) return;
    await endSession(selectedSessionId);
    setSelectedSessionId(undefined);
  };

  const handleNewChat = async (studentId?: string) => {
    if (userRole === 'admin' && studentId) {
      // Admin initiating chat with student
      const session = await createSession(undefined, studentId);
      if (session) {
        setSelectedSessionId(session.id);
      }
    } else if (userRole === 'student') {
      // Student creating new chat
      const session = await createSession();
      if (session) {
        setSelectedSessionId(session.id);
      }
    }
  };

  const handleSelectConversation = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    if (userRole === 'admin') {
      joinSession(sessionId);
    }
  };

  const currentSession = activeSession?.id === selectedSessionId ? activeSession : undefined;

  return (
    <div className="flex h-full w-full">
      {/* Conversations List */}
      <div
        className={cn(
          "border-r border-border bg-background",
          isMobile && selectedSessionId
            ? "hidden"
            : "w-full md:w-80 flex-shrink-0"
        )}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="font-semibold text-foreground text-lg">Chats</h2>
          {userRole === 'admin' && (
            <Button size="sm" onClick={() => setShowStudentSelector(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          )}
          {userRole === 'student' && (
            <Button size="sm" onClick={() => handleNewChat()}>
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          )}
        </div>
        <ConversationsList
          userId={user?.id}
          userRole={userRole}
          selectedSessionId={selectedSessionId}
          onSelectConversation={handleSelectConversation}
        />
      </div>

      {/* Chat Window */}
      <div className={cn("flex-1 flex flex-col", !selectedSessionId && "hidden md:flex")}>
        {!selectedSessionId ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Select a conversation to start chatting</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b border-border flex items-center gap-3">
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedSessionId(undefined)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">
                  {currentSession?.status === 'waiting' ? 'Waiting for admin...' : 'Live Chat'}
                </h3>
              </div>
              <Button variant="destructive" size="sm" onClick={handleEndChat}>
                End Chat
              </Button>
            </div>

            {/* Mobile Warning for Screen Share */}
            {isMobile && currentSession?.status === 'active' && (
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
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg.message}
                    isOwn={msg.sender_id === user?.id}
                    isSystem={msg.message_type === 'system'}
                    messageType={msg.message_type}
                    fileUrl={msg.file_url}
                    timestamp={msg.created_at}
                    readAt={msg.read_at}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Controls */}
            <div className="p-4 border-t border-border space-y-2">
              {/* WebRTC Controls - Hide screen share on mobile */}
              {currentSession?.status === 'active' && !isMobile && (
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
              {currentSession?.status === 'active' && isMobile && (
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
            </div>
          </>
        )}
      </div>

      {/* Student Selector Modal (Admin only) */}
      {userRole === 'admin' && (
        <StudentSelector
          open={showStudentSelector}
          onOpenChange={setShowStudentSelector}
          onSelectStudent={handleNewChat}
        />
      )}
    </div>
  );
};

import { supabase } from '@/integrations/supabase/client';
