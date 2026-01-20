'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Modal } from '@/components/ui/Modal';
import { useGameStore, Character, ChatMessage } from '@/lib/store';

interface ChatModalProps {
  character: Character;
  storyId: string;
  onClose: () => void;
}

export function ChatModal({ character, storyId, onClose }: ChatModalProps) {
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { chatHistories, addChatMessage, updateLastMessage, startTimer } = useGameStore();
  const messages = chatHistories[character.id] || [];

  // Use imageUrl from Supabase, fallback to filesystem path for legacy stories
  const imageUrl = character.imageUrl || `/stories/${storyId}/assets/characters/${character.id}.png`;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const message = input.trim();
    setInput('');
    setIsStreaming(true);
    startTimer(); // Start the game timer on first message

    // Add user message to store
    const userMsgId = `user-${Date.now()}`;
    addChatMessage(character.id, { id: userMsgId, role: 'user', content: message });

    // Add placeholder assistant message
    const assistantMsgId = `assistant-${Date.now()}`;
    addChatMessage(character.id, { id: assistantMsgId, role: 'assistant', content: '' });

    try {
      const response = await fetch('/api/game/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          characterId: character.id,
          message,
          history: messages.map((m) => ({ role: m.role === 'user' ? 'user' : 'character', content: m.content })),
        }),
      });

      const data = await response.json();
      updateLastMessage(character.id, data.response);
    } catch (error) {
      console.error('Failed to send message:', error);
      updateLastMessage(character.id, 'Sorry, I couldn\'t respond. Please try again.');
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} size="lg">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-slate-700">
        <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-amber-500">
          <Image
            src={imageUrl}
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

        {messages.map((message, index) => (
          <MessageBubble
            key={index}
            message={message}
            characterName={character.name}
            isLast={index === messages.length - 1}
            isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
          />
        ))}

        {isStreaming && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0" />
            <div className="chat-bubble-character">
              <span className="typing-cursor" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            disabled={isStreaming}
            className="flex-1 bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
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
  message,
  characterName,
  isLast,
  isStreaming,
}: {
  message: ChatMessage;
  characterName: string;
  isLast: boolean;
  isStreaming: boolean;
}) {
  const isUser = message.role === 'user';

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
        } ${isStreaming && isLast ? 'typing-cursor' : ''}`}
      >
        {message.content}
      </div>
    </div>
  );
}
