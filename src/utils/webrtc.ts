import { supabase } from "@/integrations/supabase/client";

export interface SignalData {
  type: 'offer' | 'answer' | 'ice-candidate';
  data: any;
}

export class RTCPeerConnectionManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private sessionId: string;
  private userId: string;
  private onRemoteStreamCallback?: (stream: MediaStream) => void;
  private onConnectionStateChangeCallback?: (state: RTCPeerConnectionState) => void;
  private signalChannel: any = null;

  constructor(
    sessionId: string,
    userId: string,
    onRemoteStream?: (stream: MediaStream) => void,
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void
  ) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.onRemoteStreamCallback = onRemoteStream;
    this.onConnectionStateChangeCallback = onConnectionStateChange;
  }

  async initialize() {
    console.log('Initializing WebRTC connection');
    
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    this.pc = new RTCPeerConnection(configuration);

    // Set up event handlers
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('New ICE candidate:', event.candidate);
        this.sendSignal('ice-candidate', event.candidate);
      }
    };

    this.pc.ontrack = (event) => {
      console.log('Received remote track:', event.streams[0]);
      this.remoteStream = event.streams[0];
      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(event.streams[0]);
      }
    };

    this.pc.onconnectionstatechange = () => {
      console.log('Connection state:', this.pc?.connectionState);
      if (this.onConnectionStateChangeCallback && this.pc) {
        this.onConnectionStateChangeCallback(this.pc.connectionState);
      }
    };

    // Subscribe to WebRTC signals
    await this.subscribeToSignals();
  }

  private async subscribeToSignals() {
    this.signalChannel = supabase
      .channel(`webrtc-signals-${this.sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webrtc_signals',
          filter: `session_id=eq.${this.sessionId}`,
        },
        async (payload) => {
          const signal = payload.new;
          
          // Ignore signals from self
          if (signal.sender_id === this.userId) return;

          console.log('Received signal:', signal.signal_type, signal.signal_data);

          if (signal.signal_type === 'offer') {
            await this.handleOffer(signal.signal_data);
          } else if (signal.signal_type === 'answer') {
            await this.handleAnswer(signal.signal_data);
          } else if (signal.signal_type === 'ice-candidate') {
            await this.handleIceCandidate(signal.signal_data);
          }
        }
      )
      .subscribe();
  }

  async startScreenShare() {
    try {
      console.log('Starting screen share');
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        },
        audio: true,
      });

      this.localStream = stream;

      // Add tracks to peer connection
      if (this.pc) {
        stream.getTracks().forEach((track) => {
          this.pc!.addTrack(track, stream);
        });
      }

      // Handle screen share stop
      stream.getVideoTracks()[0].onended = () => {
        console.log('Screen share stopped');
        this.stopScreenShare();
      };

      return stream;
    } catch (error) {
      console.error('Error starting screen share:', error);
      throw error;
    }
  }

  async startAudio() {
    try {
      console.log('Starting audio');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      // If we already have a local stream (screen share), add audio tracks to it
      if (this.localStream) {
        stream.getAudioTracks().forEach((track) => {
          this.localStream!.addTrack(track);
          if (this.pc) {
            this.pc.addTrack(track, this.localStream!);
          }
        });
      } else {
        this.localStream = stream;
        if (this.pc) {
          stream.getTracks().forEach((track) => {
            this.pc!.addTrack(track, stream);
          });
        }
      }

      return stream;
    } catch (error) {
      console.error('Error starting audio:', error);
      throw error;
    }
  }

  stopScreenShare() {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => track.stop());
    }
  }

  stopAudio() {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => track.stop());
    }
  }

  async createOffer() {
    if (!this.pc) {
      throw new Error('Peer connection not initialized');
    }

    console.log('Creating offer');
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await this.sendSignal('offer', offer);
  }

  private async handleOffer(offer: RTCSessionDescriptionInit) {
    if (!this.pc) return;

    console.log('Handling offer');
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    await this.sendSignal('answer', answer);
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.pc) return;

    console.log('Handling answer');
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  private async handleIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.pc) return;

    console.log('Adding ICE candidate');
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  private async sendSignal(type: 'offer' | 'answer' | 'ice-candidate', data: any) {
    console.log('Sending signal:', type);
    
    const { error } = await supabase.from('webrtc_signals').insert({
      session_id: this.sessionId,
      sender_id: this.userId,
      signal_type: type,
      signal_data: data,
    });

    if (error) {
      console.error('Error sending signal:', error);
      throw error;
    }
  }

  cleanup() {
    console.log('Cleaning up WebRTC connection');
    
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    if (this.signalChannel) {
      supabase.removeChannel(this.signalChannel);
      this.signalChannel = null;
    }

    this.remoteStream = null;
  }

  getLocalStream() {
    return this.localStream;
  }

  getRemoteStream() {
    return this.remoteStream;
  }

  getConnectionState() {
    return this.pc?.connectionState || 'closed';
  }
}
