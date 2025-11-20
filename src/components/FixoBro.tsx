import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { X, Send, Bot, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useVoiceMode } from "@/hooks/useVoiceMode";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const FixoBro = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceModeEnabled, setVoiceModeEnabled] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessageRef = useRef<string>("");

  const handleVoiceTranscript = (text: string) => {
    setInput(text);
    handleSend(text);
  };

  const {
    isListening,
    isSpeaking,
    isSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  } = useVoiceMode({
    onTranscript: handleVoiceTranscript,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Initial greeting message
      setMessages([
        {
          role: "assistant",
          content: "Hey, I'm Fixo Bro 👋. Tell me what issue you're facing with your device."
        }
      ]);
    }
  }, [isOpen]);

  const handleSend = async (messageText?: string) => {
    const userMessage = (messageText || input).trim();
    if (!userMessage || isLoading) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('fixobro', {
        body: {
          message: userMessage,
          userId: user?.id || 'anonymous'
        }
      });

      if (error) throw error;

      if (data?.response) {
        const assistantMessage = data.response;
        setMessages(prev => [...prev, { role: "assistant", content: assistantMessage }]);
        lastAssistantMessageRef.current = assistantMessage;
        
        // Auto-speak response in voice mode
        if (voiceModeEnabled && isSupported) {
          speak(assistantMessage);
        }
      } else {
        throw new Error('No response from Fixo Bro');
      }
    } catch (error) {
      console.error('Error calling Fixo Bro:', error);
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Couldn't reach Fixo Bro. Please try again."
      });
      const errorMsg = "Oops! I'm having trouble connecting. Please try again in a moment.";
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: errorMsg
      }]);
      if (voiceModeEnabled && isSupported) {
        speak(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-destructive hover:bg-destructive/90 transition-all hover:scale-110 z-50"
          aria-label="Open Fixo Bro"
        >
          <Bot className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[90vw] md:w-96 h-[500px] shadow-2xl flex flex-col z-50 border-2 border-destructive/20 animate-scale-in">
          {/* Header */}
          <div className="bg-destructive text-destructive-foreground p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                <Bot className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-bold">Fixo Bro</h3>
                <p className="text-xs opacity-90">
                  {voiceModeEnabled ? (isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Voice Mode') : 'Tech Support Assistant'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSupported && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setVoiceModeEnabled(!voiceModeEnabled);
                    if (voiceModeEnabled) {
                      stopListening();
                      stopSpeaking();
                    }
                  }}
                  className="hover:bg-destructive-foreground/10"
                  aria-label={voiceModeEnabled ? "Disable voice mode" : "Enable voice mode"}
                  title={voiceModeEnabled ? "Voice Mode ON" : "Voice Mode OFF"}
                >
                  {voiceModeEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsOpen(false);
                  stopListening();
                  stopSpeaking();
                }}
                className="hover:bg-destructive-foreground/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-destructive text-destructive-foreground'
                      : 'bg-background border border-border flex gap-2'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <Bot className="h-4 w-4 mt-1 flex-shrink-0 text-destructive" />
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-background border border-border rounded-lg px-4 py-2 flex gap-2">
                  <Bot className="h-4 w-4 mt-1 text-destructive" />
                  <div className="flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border bg-background">
            <div className="flex gap-2">
              {voiceModeEnabled && isSupported ? (
                <>
                  <Button
                    onClick={isListening ? stopListening : startListening}
                    disabled={isLoading || isSpeaking}
                    className={cn(
                      "flex-1 transition-all",
                      isListening 
                        ? "bg-red-500 hover:bg-red-600 animate-pulse" 
                        : "bg-destructive hover:bg-destructive/90"
                    )}
                    aria-label={isListening ? "Stop listening" : "Start listening"}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="h-4 w-4 mr-2" />
                        Stop Listening
                      </>
                    ) : (
                      <>
                        <Mic className="h-4 w-4 mr-2" />
                        {isSpeaking ? 'Speaking...' : 'Tap to Speak'}
                      </>
                    )}
                  </Button>
                  {isSpeaking && (
                    <Button
                      onClick={stopSpeaking}
                      variant="outline"
                      size="icon"
                      aria-label="Stop speaking"
                    >
                      <VolumeX className="h-4 w-4" />
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Describe your device issue..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading}
                    size="icon"
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      )}
    </>
  );
};