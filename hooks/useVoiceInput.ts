'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// TypeScript declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionResult {
  0: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface UseVoiceInputOptions {
  onFinalTranscript: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  onNoSpeech?: () => void;
  onError?: (error: string) => void;
  lang?: string;
}

export function useVoiceInput({
  onFinalTranscript,
  onInterimTranscript,
  onNoSpeech,
  onError,
  lang = 'en-US'
}: UseVoiceInputOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const hasResultRef = useRef(false);

  // Check support on mount
  useEffect(() => {
    const supported = typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    setIsSupported(supported);
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported || typeof window === 'undefined') return;

    // Stop any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();
    hasResultRef.current = false;

    recognition.continuous = false; // Stop after user stops speaking
    recognition.interimResults = true; // Show interim results
    recognition.lang = lang;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      hasResultRef.current = true;
      const lastResultIndex = event.results.length - 1;
      const lastResult = event.results[lastResultIndex];
      const transcript = lastResult[0].transcript;

      if (lastResult.isFinal) {
        // Final result - commit to input
        onFinalTranscript(transcript);
      } else if (onInterimTranscript) {
        // Interim result - optional preview
        onInterimTranscript(transcript);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // If no results were captured, notify
      if (!hasResultRef.current && onNoSpeech) {
        onNoSpeech();
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);

      if (event.error === 'not-allowed') {
        onError?.('Microphone access denied. Please allow microphone access.');
      } else if (event.error === 'no-speech') {
        onNoSpeech?.();
      } else {
        onError?.(`Voice input error: ${event.error}`);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setIsListening(false);
      onError?.('Failed to start voice input');
    }
  }, [isSupported, lang, onFinalTranscript, onInterimTranscript, onNoSpeech, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
  };
}
