import { useEffect, useRef } from 'react';

export type BroadcastMessage = {
  type: 'complaint_update' | 'new_complaint' | 'notification' | 'status_change';
  payload: any;
  timestamp: number;
};

export const useBroadcastSync = (
  channelName: string,
  onMessage: (message: BroadcastMessage) => void
) => {
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    // Check if BroadcastChannel is supported
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('BroadcastChannel API is not supported in this browser');
      return;
    }

    // Create channel
    channelRef.current = new BroadcastChannel(channelName);

    // Listen for messages
    channelRef.current.onmessage = (event: MessageEvent<BroadcastMessage>) => {
      console.log('Received broadcast message:', event.data);
      onMessage(event.data);
    };

    // Cleanup on unmount
    return () => {
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, [channelName, onMessage]);

  const broadcast = (message: Omit<BroadcastMessage, 'timestamp'>) => {
    if (channelRef.current) {
      const fullMessage: BroadcastMessage = {
        ...message,
        timestamp: Date.now(),
      };
      channelRef.current.postMessage(fullMessage);
      console.log('Broadcasted message:', fullMessage);
    }
  };

  return { broadcast };
};
