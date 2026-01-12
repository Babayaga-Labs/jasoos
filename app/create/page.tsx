'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CreateMysteryForm } from '@/components/create/CreateMysteryForm';
import { GenerationProgress, GenerationStep } from '@/components/create/GenerationProgress';

export default function CreatePage() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<GenerationStep | null>(null);
  const [progressMessage, setProgressMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [synopsis, setSynopsis] = useState('');

  const handleGenerate = async (synopsisText: string) => {
    setSynopsis(synopsisText);
    setIsGenerating(true);
    setError(null);
    setCurrentStep(null);
    setProgress(0);

    try {
      const response = await fetch('/api/ugc/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ synopsis: synopsisText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start generation');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'progress') {
                setCurrentStep(data.step);
                setProgressMessage(data.message);
                setProgress(data.progress);
              } else if (data.type === 'complete') {
                // Success! Navigate to the game
                router.push(`/game/${data.storyId}`);
                return;
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete JSON
            }
          }
        }
      }
    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'Generation failed');
      setIsGenerating(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setIsGenerating(false);
    setCurrentStep(null);
    setProgress(0);
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <div className="py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center text-slate-400 hover:text-amber-400 transition-colors mb-6"
          >
            ← Back to Cases
          </Link>

          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">
              <span className="text-amber-400">Create</span> Your Own Mystery
            </h1>
            <p className="text-slate-400">
              Describe your mystery and we&apos;ll generate everything else
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 pb-20">
        {!isGenerating ? (
          <CreateMysteryForm
            onSubmit={handleGenerate}
            isDisabled={isGenerating}
          />
        ) : (
          <GenerationProgress
            currentStep={currentStep}
            message={progressMessage}
            progress={progress}
            error={error}
            onRetry={handleRetry}
          />
        )}
      </div>
    </main>
  );
}
