import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';

interface ScreenShareDisplayProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isScreenSharing: boolean;
}

const ScreenShareDisplay = ({
  localStream,
  remoteStream,
  isScreenSharing,
}: ScreenShareDisplayProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (!localStream && !remoteStream) {
    return null;
  }

  return (
    <div className="p-4 border-b border-border bg-muted/50">
      {/* Remote Stream (what other person is sharing) */}
      {remoteStream && (
        <Card className="mb-2 overflow-hidden bg-black">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-auto max-h-48 object-contain"
          />
          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            Remote Screen
          </div>
        </Card>
      )}

      {/* Local Stream (what you're sharing) */}
      {localStream && isScreenSharing && (
        <Card className="overflow-hidden bg-black relative">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto max-h-32 object-contain"
          />
          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            Your Screen
          </div>
        </Card>
      )}
    </div>
  );
};

export default ScreenShareDisplay;
