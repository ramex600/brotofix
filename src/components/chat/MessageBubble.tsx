import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: string;
  isOwn: boolean;
  isSystem: boolean;
  messageType: 'text' | 'system' | 'file';
  fileUrl?: string | null;
  timestamp: string;
  readAt?: string | null;
}

export const MessageBubble = ({
  message,
  isOwn,
  isSystem,
  messageType,
  fileUrl,
  timestamp,
  readAt,
}: MessageBubbleProps) => {
  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <Badge variant="secondary" className="text-xs">
          {message}
        </Badge>
      </div>
    );
  }

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-lg px-4 py-2",
          isOwn
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {messageType === 'file' && fileUrl ? (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline break-all"
          >
            {message}
          </a>
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words">{message}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs opacity-70">
            {new Date(timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          {isOwn && (
            <span className="text-xs opacity-70">
              {readAt ? '✓✓' : '✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
