'use client';

export type GenerationStep =
  | 'story'
  | 'characters'
  | 'plot-points'
  | 'scene-image'
  | 'character-images';

interface GenerationProgressProps {
  currentStep: GenerationStep | null;
  message: string;
  progress: number;
  error?: string | null;
  onRetry?: () => void;
}

const STEPS: { id: GenerationStep; label: string; icon: string }[] = [
  { id: 'story', label: 'Story Structure', icon: '📖' },
  { id: 'characters', label: 'Characters', icon: '👥' },
  { id: 'plot-points', label: 'Plot Points', icon: '🔍' },
  { id: 'scene-image', label: 'Scene Image', icon: '🏠' },
  { id: 'character-images', label: 'Portraits', icon: '🎨' },
];

export function GenerationProgress({
  currentStep,
  message,
  progress,
  error,
  onRetry,
}: GenerationProgressProps) {
  const currentStepIndex = currentStep
    ? STEPS.findIndex((s) => s.id === currentStep)
    : -1;

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-6 text-center">
          <div className="text-4xl mb-4">❌</div>
          <h3 className="text-xl font-bold text-red-400 mb-2">Generation Failed</h3>
          <p className="text-slate-300 mb-4">{error}</p>
          {onRetry && (
            <button onClick={onRetry} className="btn btn-secondary">
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Progress bar */}
      <div className="relative">
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-right text-sm text-slate-500 mt-1">{progress}%</p>
      </div>

      {/* Current message */}
      <div className="text-center">
        <div className="inline-flex items-center gap-3 px-6 py-3 bg-slate-800 rounded-full border border-slate-700">
          <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-300">{message || 'Preparing...'}</span>
        </div>
      </div>

      {/* Step indicators */}
      <div className="grid grid-cols-5 gap-2">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isPending = index > currentStepIndex;

          return (
            <div
              key={step.id}
              className={`flex flex-col items-center p-3 rounded-lg transition-all ${
                isCompleted
                  ? 'bg-green-900/30 border border-green-500/30'
                  : isCurrent
                    ? 'bg-amber-900/30 border border-amber-500/50'
                    : 'bg-slate-800/50 border border-slate-700'
              }`}
            >
              <span className="text-2xl mb-1">
                {isCompleted ? '✓' : step.icon}
              </span>
              <span
                className={`text-xs text-center ${
                  isCompleted
                    ? 'text-green-400'
                    : isCurrent
                      ? 'text-amber-400'
                      : 'text-slate-500'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Helpful tips while waiting */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <h4 className="text-sm font-medium text-slate-400 mb-2">Did you know?</h4>
        <p className="text-sm text-slate-500">
          {currentStepIndex === 0 && 'The AI is crafting your unique mystery plot, setting, and solution...'}
          {currentStepIndex === 1 && 'Each character gets their own personality, secrets, and alibi...'}
          {currentStepIndex === 2 && 'Plot points determine what clues the detective can discover...'}
          {currentStepIndex === 3 && 'The scene image sets the atmosphere for your mystery...'}
          {currentStepIndex === 4 && 'Character portraits bring your suspects to life...'}
          {currentStepIndex === -1 && 'Your mystery is being prepared for generation...'}
        </p>
      </div>
    </div>
  );
}
