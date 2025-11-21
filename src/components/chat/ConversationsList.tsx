import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2 } from 'lucide-react';
import { ConversationItem } from './ConversationItem';
import { useConversations } from '@/hooks/useConversations';

interface ConversationsListProps {
  userId: string | undefined;
  userRole: 'student' | 'admin';
  selectedSessionId?: string;
  onSelectConversation: (sessionId: string) => void;
}

export const ConversationsList = ({
  userId,
  userRole,
  selectedSessionId,
  onSelectConversation,
}: ConversationsListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { conversations, loading } = useConversations(userId, userRole);

  const filteredConversations = conversations.filter((conv) =>
    conv.participantName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeConversations = filteredConversations.filter(
    (c) => c.status === 'active' || c.status === 'waiting'
  );
  const endedConversations = filteredConversations.filter((c) => c.status === 'ended');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b border-border h-12 px-4">
          <TabsTrigger value="all" className="flex-1">
            All ({conversations.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="flex-1">
            Active ({activeConversations.length})
          </TabsTrigger>
          <TabsTrigger value="ended" className="flex-1">
            Archive ({endedConversations.length})
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          <TabsContent value="all" className="m-0 p-2">
            {conversations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No conversations yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredConversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    {...conv}
                    isActive={conv.sessionId === selectedSessionId}
                    onClick={() => onSelectConversation(conv.sessionId)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="m-0 p-2">
            {activeConversations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No active conversations</p>
              </div>
            ) : (
              <div className="space-y-1">
                {activeConversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    {...conv}
                    isActive={conv.sessionId === selectedSessionId}
                    onClick={() => onSelectConversation(conv.sessionId)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ended" className="m-0 p-2">
            {endedConversations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No archived conversations</p>
              </div>
            ) : (
              <div className="space-y-1">
                {endedConversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    {...conv}
                    isActive={conv.sessionId === selectedSessionId}
                    onClick={() => onSelectConversation(conv.sessionId)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
};
