import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseVoiceModeProps {
  onTranscript: (text: string) => void;
  onSpeechEnd?: () => void;
}

export const useVoiceMode = ({ onTranscript, onSpeechEnd }: UseVoiceModeProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const { toast } = useToast();
  
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    // Check if Web Speech API is supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const supported = !!SpeechRecognition && 'speechSynthesis' in window;
    setIsSupported(supported);

    if (!supported) {
      console.warn('Web Speech API is not supported in this browser');
      return;
    }

    // Initialize speech recognition
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      console.log('Speech recognized:', transcript);
      onTranscript(transcript);
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        toast({
          variant: 'destructive',
          title: 'Voice Error',
          description: `Could not recognize speech: ${event.error}`,
        });
      }
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
      onSpeechEnd?.();
    };

    // Initialize speech synthesis
    synthesisRef.current = window.speechSynthesis;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, [onTranscript, onSpeechEnd, toast]);

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) {
      toast({
        variant: 'destructive',
        title: 'Not Supported',
        description: 'Voice recognition is not supported in your browser.',
      });
      return;
    }

    try {
      // Stop any ongoing speech
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
        setIsSpeaking(false);
      }

      recognitionRef.current.start();
      setIsListening(true);
      console.log('Started listening...');
    } catch (error) {
      console.error('Error starting recognition:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not start voice recognition.',
      });
    }
  }, [isSupported, toast]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const speak = useCallback((text: string) => {
    if (!isSupported || !synthesisRef.current) {
      return;
    }

    // Cancel any ongoing speech
    synthesisRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      console.log('Started speaking...');
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      console.log('Finished speaking');
    };

    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setIsSpeaking(false);
    };

    synthesisRef.current.speak(utterance);
  }, [isSupported]);

  const stopSpeaking = useCallback(() => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
    }
  }, []);

  return {
    isListening,
    isSpeaking,
    isSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
};
