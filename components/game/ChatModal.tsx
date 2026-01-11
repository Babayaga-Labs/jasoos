'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Modal } from '@/components/ui/Modal';
import { useGameStore, Character } from '@/lib/store';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatModalProps {
  character: Character;
  storyId: string;
  onClose: () => void;
}

export function ChatModal({ character, storyId, onClose }: ChatModalProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { unlockPlotPoint, plotPoints } = useGameStore();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Client-side plot point detection function (same logic as server)
  function checkForPlotPoints(
    response: string,
    characterId: string,
    plotPoints: any[]
  ): string[] {
    const revealed: string[] = [];
    const responseLower = response.toLowerCase();

    for (const pp of plotPoints) {
      // Check if this character can reveal this plot point
      if (!pp.revealedBy?.includes(characterId)) continue;

      // Check for detection hints
      const hasHint = pp.detectionHints?.some((hint: string) =>
        responseLower.includes(hint.toLowerCase())
      );

      if (hasHint) {
        revealed.push(pp.id);
      }
    }

    return revealed;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Add placeholder assistant message
    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      // Build messages array for API
      const apiMessages = [...messages, userMsg].map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch('/api/game/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyId,
          characterId: character.id,
          messages: apiMessages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      // Stream the response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;

          // Update assistant message with streaming content
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: fullContent }
                : msg
            )
          );
        }
      }

      // Check for plot points after stream completes
      const plotPointsRevealed = checkForPlotPoints(fullContent, character.id, plotPoints);
      plotPointsRevealed.forEach((plotPointId: string) => {
        unlockPlotPoint(plotPointId);
      });
    } catch (error) {
      console.error('Error sending message:', error);
      // Update assistant message with error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, content: 'Sorry, I encountered an error. Please try again.' }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <Modal isOpen={true} onClose={onClose} size="lg">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-slate-700">
        <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-amber-500">
          <Image
            src={`/stories/${storyId}/assets/characters/${character.id}.png`}
            alt={character.name}
            fill
            className="object-cover"
          />
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-white">{character.name}</h2>
          <p className="text-sm text-slate-400">{character.role}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors p-2"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[50vh]">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 py-8">
            <p>Start interrogating {character.name}.</p>
            <p className="text-sm mt-2">Ask about their whereabouts, relationships, or the crime.</p>
          </div>
        )}

        {messages.map((message, index) => {
          const isUser = message.role === 'user';
          const isLast = index === messages.length - 1;
          const isStreaming = isLoading && isLast && !isUser;

          return (
            <MessageBubble
              key={message.id}
              content={message.content}
              isUser={isUser}
              characterName={character.name}
              isStreaming={isStreaming}
              hasPlotPoints={false}
            />
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Ask a question..."
            disabled={isLoading}
            className="flex-1 bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MessageBubble({
  content,
  isUser,
  characterName,
  isStreaming,
  hasPlotPoints,
}: {
  content: string;
  isUser: boolean;
  characterName: string;
  isStreaming: boolean;
  hasPlotPoints: boolean;
}) {
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm ${
          isUser ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-300'
        }`}
      >
        {isUser ? '🔍' : characterName[0]}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[80%] ${
          isUser ? 'chat-bubble-user' : 'chat-bubble-character'
        } ${isStreaming ? 'typing-cursor' : ''}`}
      >
        {content}
        {hasPlotPoints && (
          <span className="block mt-2 text-xs text-amber-400">
            📌 New evidence uncovered!
          </span>
        )}
      </div>
    </div>
  );
}
