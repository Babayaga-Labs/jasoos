'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { WizardProvider, useWizard } from './WizardContext';
import { WizardStepper } from './WizardStepper';

interface WizardLayoutProps {
  children: ReactNode;
}

function WizardLayoutInner({ children }: WizardLayoutProps) {
  const { state } = useWizard();

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

            <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
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
      <main className="relative">
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

          {children}
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
