'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { WizardProvider, useWizard } from './WizardContext';
import { WizardStepper } from './WizardStepper';

// Rotating creation texts for loading state
const CREATION_TEXTS = [
  "Weaving the threads of mystery...",
  "Crafting intricate plot points...",
  "Breathing life into characters...",
  "Planting clues in the shadows...",
  "Setting the scene for intrigue...",
  "Weaving secrets into the narrative...",
];

function LoadingIndicator() {
  const { state } = useWizard();
  const [textIndex, setTextIndex] = useState(0);

  // Rotate text every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % CREATION_TEXTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Determine the subtitle based on current stage
  const getSubtitle = () => {
    if (state.generationProgress?.step) {
      return state.generationProgress.step;
    }
    if (state.scaffoldGenerating && state.premise) {
      return `"${state.premise.slice(0, 80)}${state.premise.length > 80 ? '...' : ''}"`;
    }
    return null;
  };

  const subtitle = getSubtitle();

  return (
    <div className="flex flex-col items-center justify-center py-20">
      {/* Magic wand with glow */}
      <div className="relative mb-8">
        {/* Glow effect */}
        <div className="absolute inset-0 w-24 h-24 bg-violet-500/30 rounded-full blur-2xl animate-pulse-slow" />

        {/* Rotating wand */}
        <div className="relative w-24 h-24 flex items-center justify-center animate-spin-slow">
          <svg
            className="w-16 h-16 text-violet-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Wand */}
            <path d="M15 4V2" />
            <path d="M15 16v-2" />
            <path d="M8 9h2" />
            <path d="M20 9h2" />
            <path d="M17.8 11.8L19 13" />
            <path d="M15 9h0" />
            <path d="M17.8 6.2L19 5" />
            <path d="M3 21l9-9" />
            <path d="M12.2 6.2L11 5" />
          </svg>
        </div>
      </div>

      {/* Main text with fade animation */}
      <p className="text-xl text-white font-medium mb-3 animate-fade-in-out">
        {CREATION_TEXTS[textIndex]}
      </p>

      {/* Subtitle (premise or progress step) */}
      {subtitle && (
        <p className="text-sm text-slate-400 text-center max-w-md px-4 italic">
          {subtitle}
        </p>
      )}

      {/* Progress bar if available */}
      {state.generationProgress && (
        <div className="mt-6 w-64">
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 transition-all duration-500"
              style={{ width: `${state.generationProgress.progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2 text-center">
            {state.generationProgress.progress}%
          </p>
        </div>
      )}
    </div>
  );
}

interface WizardLayoutProps {
  children: ReactNode;
}

function WizardLayoutInner({ children }: WizardLayoutProps) {
  const { state, isAnyGenerating } = useWizard();
  const mainRef = useRef<HTMLDivElement>(null);

  // Scroll to top when loading starts
  useEffect(() => {
    if (isAnyGenerating && mainRef.current) {
      mainRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isAnyGenerating]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Ambient background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-pink-600/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative border-b border-slate-800/50 backdrop-blur-sm bg-slate-950/50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors"
            >
              <span className="text-2xl">←</span>
              <span className="font-medium">Back to Home</span>
            </Link>

            <h1 className="text-xl font-bold text-violet-400">
              Create Your Mystery
            </h1>

            <div className="w-32" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      {/* Stepper */}
      <div className="relative border-b border-slate-800/30 backdrop-blur-sm bg-slate-900/30">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <WizardStepper />
        </div>
      </div>

      {/* Main content */}
      <main className="relative" ref={mainRef}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          {/* Error display */}
          {state.error && (
            <div className="mb-8 p-4 rounded-xl bg-red-900/30 border border-red-500/30 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-medium text-red-400">Something went wrong</p>
                  <p className="text-sm text-red-300/80">{state.error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Show loading indicator or children */}
          {isAnyGenerating ? <LoadingIndicator /> : children}
        </div>
      </main>
    </div>
  );
}

export function WizardLayout({ children }: WizardLayoutProps) {
  return (
    <WizardProvider>
      <WizardLayoutInner>{children}</WizardLayoutInner>
    </WizardProvider>
  );
}
