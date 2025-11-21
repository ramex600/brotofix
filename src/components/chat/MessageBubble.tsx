import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { FileIcon, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isImage, setIsImage] = useState(false);
  const [isVideo, setIsVideo] = useState(false);

  useEffect(() => {
    if (messageType === 'file' && fileUrl) {
      // Check if fileUrl is a path or full URL
      let filePath = fileUrl;
      
      // If it's a full URL, extract the path
      if (fileUrl.includes('/storage/v1/object/public/complaint-files/')) {
        const urlParts = fileUrl.split('/storage/v1/object/public/complaint-files/');
        filePath = urlParts[1];
      }
      
      // Check file type
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];
      
      const isImageFile = imageExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
      const isVideoFile = videoExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
      
      setIsImage(isImageFile);
      setIsVideo(isVideoFile);
      
      // Get signed URL for secure access
      supabase.storage
        .from('complaint-files')
        .createSignedUrl(filePath, 3600) // 1 hour expiry
        .then(({ data, error }) => {
          if (!error && data) {
            setSignedUrl(data.signedUrl);
          } else {
            console.error('Error creating signed URL:', error);
          }
        });
    }
  }, [messageType, fileUrl]);

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
        {messageType === 'file' && signedUrl ? (
          <div className="space-y-2">
            {isImage ? (
              <div className="space-y-2">
                <img
                  src={signedUrl}
                  alt={message}
                  className="max-w-full max-h-64 rounded border border-border/50"
                  loading="lazy"
                />
                <a
                  href={signedUrl}
                  download
                  className="flex items-center gap-2 text-xs underline hover:no-underline"
                >
                  <Download className="w-3 h-3" />
                  {message}
                </a>
              </div>
            ) : isVideo ? (
              <div className="space-y-2">
                <video
                  controls
                  className="max-w-full max-h-64 rounded border border-border/50"
                  preload="metadata"
                >
                  <source src={signedUrl} />
                  Your browser does not support the video tag.
                </video>
                <a
                  href={signedUrl}
                  download
                  className="flex items-center gap-2 text-xs underline hover:no-underline"
                >
                  <Download className="w-3 h-3" />
                  {message}
                </a>
              </div>
            ) : (
              <a
                href={signedUrl}
                download
                className="flex items-center gap-2 text-sm underline hover:no-underline break-all"
              >
                <FileIcon className="w-4 h-4 flex-shrink-0" />
                {message}
              </a>
            )}
          </div>
        ) : messageType === 'file' ? (
          <div className="flex items-center gap-2 text-sm">
            <FileIcon className="w-4 h-4" />
            <span className="break-all">{message}</span>
          </div>
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
