import { useState, useRef } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "./Button";
import { processVoiceInput } from "../services/geminiService";
import { AIProductSuggestion } from "../types";

interface VoiceInputProps {
  onSuggestion: (suggestion: Partial<AIProductSuggestion>) => void;
  onError?: (message: string) => void;
  industry?: string;
  letterhead?: string;
  disabled?: boolean;
}

export const VoiceInput = ({ onSuggestion, onError, industry, letterhead, disabled = false }: VoiceInputProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    if (disabled) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      if (onError) {
        onError("Speech recognition not supported in this browser.");
      } else {
        console.error("Speech recognition not supported in this browser.");
      }
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = false;
    recognitionRef.current.lang = "en-IN";

    recognitionRef.current.onstart = () => setIsListening(true);
    recognitionRef.current.onend = () => setIsListening(false);
    
    recognitionRef.current.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsProcessing(true);
      const suggestion = await processVoiceInput(transcript, industry, letterhead);
      if (suggestion) {
        onSuggestion(suggestion);
      }
      setIsProcessing(false);
    };

    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  return (
    <Button
      variant={isListening ? "danger" : "outline"}
      size="icon"
      onClick={isListening ? stopListening : startListening}
      isLoading={isProcessing}
      title="Voice Input"
      disabled={disabled}
    >
      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
};
