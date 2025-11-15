import { useState, useEffect, useRef } from 'react';
import { RTCPeerConnectionManager } from '@/utils/webrtc';
import { useToast } from '@/hooks/use-toast';

export const useWebRTC = (
  sessionId: string | undefined,
  userId: string | undefined,
  isInitiator: boolean
) => {
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('closed');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const rtcManagerRef = useRef<RTCPeerConnectionManager | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!sessionId || !userId) return;

    console.log('Initializing WebRTC for session:', sessionId);

    const manager = new RTCPeerConnectionManager(
      sessionId,
      userId,
      (stream) => {
        console.log('Remote stream received');
        setRemoteStream(stream);
      },
      (state) => {
        console.log('Connection state changed:', state);
        setConnectionState(state);
        
        if (state === 'connected') {
          toast({
            title: 'Connected',
            description: 'Screen sharing connection established',
          });
        } else if (state === 'disconnected' || state === 'failed') {
          toast({
            title: 'Disconnected',
            description: 'Screen sharing connection lost',
            variant: 'destructive',
          });
        }
      }
    );

    manager.initialize().then(() => {
      rtcManagerRef.current = manager;
      
      // If initiator, create offer after initialization
      if (isInitiator) {
        console.log('Initiator: creating offer after initialization');
      }
    });

    return () => {
      console.log('Cleaning up WebRTC');
      manager.cleanup();
      rtcManagerRef.current = null;
      setLocalStream(null);
      setRemoteStream(null);
      setIsScreenSharing(false);
      setIsAudioEnabled(false);
    };
  }, [sessionId, userId]);

  const startScreenShare = async () => {
    if (!rtcManagerRef.current) {
      toast({
        title: 'Error',
        description: 'WebRTC not initialized',
        variant: 'destructive',
      });
      return;
    }

    try {
      const stream = await rtcManagerRef.current.startScreenShare();
      setLocalStream(stream);
      setIsScreenSharing(true);
      
      // Create offer after starting screen share
      if (isInitiator) {
        await rtcManagerRef.current.createOffer();
      }

      toast({
        title: 'Screen Sharing',
        description: 'Your screen is now being shared',
      });
    } catch (error: any) {
      console.error('Error starting screen share:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start screen sharing',
        variant: 'destructive',
      });
    }
  };

  const stopScreenShare = () => {
    if (!rtcManagerRef.current) return;

    rtcManagerRef.current.stopScreenShare();
    setIsScreenSharing(false);
    
    toast({
      title: 'Screen Sharing Stopped',
      description: 'Your screen is no longer being shared',
    });
  };

  const toggleAudio = async () => {
    if (!rtcManagerRef.current) {
      toast({
        title: 'Error',
        description: 'WebRTC not initialized',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (isAudioEnabled) {
        rtcManagerRef.current.stopAudio();
        setIsAudioEnabled(false);
        toast({
          title: 'Audio Disabled',
          description: 'Your microphone is now muted',
        });
      } else {
        await rtcManagerRef.current.startAudio();
        setIsAudioEnabled(true);
        
        // Create offer after starting audio if not already sharing
        if (isInitiator && !isScreenSharing) {
          await rtcManagerRef.current.createOffer();
        }
        
        toast({
          title: 'Audio Enabled',
          description: 'Your microphone is now active',
        });
      }
    } catch (error: any) {
      console.error('Error toggling audio:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to toggle audio',
        variant: 'destructive',
      });
    }
  };

  return {
    connectionState,
    localStream,
    remoteStream,
    isScreenSharing,
    isAudioEnabled,
    startScreenShare,
    stopScreenShare,
    toggleAudio,
  };
};
