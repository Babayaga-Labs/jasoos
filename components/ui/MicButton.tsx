'use client';

import { useState } from 'react';

interface MicButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function MicButton({ isListening, isSupported, onClick, disabled }: MicButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Don't render if browser doesn't support speech recognition
  if (!isSupported) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          flex items-center gap-2 px-3 py-3 rounded-lg transition-all duration-200
          ${isListening
            ? 'bg-red-500 text-white shadow-lg shadow-red-500/40 animate-pulse-glow'
            : 'bg-slate-600 text-slate-200 hover:bg-slate-500 hover:text-white border border-slate-500'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-label={isListening ? 'Stop voice recording' : 'Start voice recording'}
      >
        {isListening ? (
          <>
            <MicOnIcon className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">Listening...</span>
          </>
        ) : (
          <>
            <MicOffIcon className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">Voice</span>
          </>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && !isListening && !disabled && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-800 text-white text-xs rounded-lg whitespace-nowrap shadow-lg border border-slate-600 z-10">
          Click to speak your question
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </div>
      )}
    </div>
  );
}

function MicOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    </svg>
  );
}

function MicOnIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 14a3 3 0 003-3V5a3 3 0 00-6 0v6a3 3 0 003 3z" />
      <path d="M19 11a1 1 0 10-2 0 5 5 0 01-10 0 1 1 0 10-2 0 7 7 0 006 6.92V21H8a1 1 0 100 2h8a1 1 0 100-2h-3v-3.08A7 7 0 0019 11z" />
    </svg>
  );
}
