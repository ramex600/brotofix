import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface ConversationItemProps {
  participantName: string;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
  status: 'active' | 'waiting' | 'ended';
  isActive?: boolean;
  onClick: () => void;
}

export const ConversationItem = ({
  participantName,
  lastMessage,
  lastMessageTime,
  unreadCount,
  status,
  isActive,
  onClick,
}: ConversationItemProps) => {
  const getStatusColor = () => {
    if (status === 'active') return 'bg-green-500';
    if (status === 'waiting') return 'bg-yellow-500';
    return 'bg-muted';
  };

  const getStatusText = () => {
    if (status === 'active') return 'Active';
    if (status === 'waiting') return 'Waiting';
    return 'Ended';
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg cursor-pointer transition-colors hover:bg-muted/50",
        isActive && "bg-muted"
      )}
    >
      <div className="relative">
        <Avatar>
          <AvatarFallback className="bg-primary text-primary-foreground">
            {participantName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background", getStatusColor())} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="font-medium text-foreground truncate">{participantName}</p>
          {lastMessageTime && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(lastMessageTime), { addSuffix: true })}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground truncate">
            {lastMessage || 'No messages yet'}
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {getStatusText()}
            </Badge>
            {unreadCount > 0 && (
              <Badge className="bg-primary text-primary-foreground min-w-[20px] h-5 flex items-center justify-center px-1.5">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
