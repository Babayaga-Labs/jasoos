'use client';

import { useWizard, type WizardStage } from './WizardContext';

interface StepConfig {
  id: WizardStage;
  label: string;
  icon: string;
  activeLabel: string;
}

const STEPS: StepConfig[] = [
  { id: 'story', label: 'Story', icon: '📖', activeLabel: 'Crafting your story...' },
  { id: 'characters', label: 'Characters', icon: '🎭', activeLabel: 'Bringing characters to life...' },
  { id: 'clues', label: 'Clues', icon: '🔍', activeLabel: 'Planting the clues...' },
  { id: 'world', label: 'World', icon: '🌍', activeLabel: 'Building your world...' },
];

const STAGE_ORDER: WizardStage[] = ['story', 'characters', 'clues', 'world'];

export function WizardStepper() {
  const { state, dispatch, canProceedFromStory, canProceedFromCharacters, canProceedFromClues } = useWizard();
  const currentIndex = STAGE_ORDER.indexOf(state.currentStage);

  const isStageAccessible = (stage: WizardStage): boolean => {
    const targetIndex = STAGE_ORDER.indexOf(stage);
    if (targetIndex <= currentIndex) return true;

    // Can only go forward if previous stage is complete
    switch (stage) {
      case 'characters':
        return canProceedFromStory;
      case 'clues':
        return canProceedFromStory && canProceedFromCharacters;
      case 'world':
        return canProceedFromStory && canProceedFromCharacters && canProceedFromClues;
      default:
        return true;
    }
  };

  const isStageComplete = (stage: WizardStage): boolean => {
    switch (stage) {
      case 'story':
        return state.storyComplete;
      case 'characters':
        return state.characters.filter(c => c.isComplete).length >= 3;
      case 'clues':
        return state.cluesComplete;
      case 'world':
        return state.worldComplete;
    }
  };

  const handleStageClick = (stage: WizardStage) => {
    if (isStageAccessible(stage)) {
      dispatch({ type: 'GO_TO_STAGE', stage });
    }
  };

  return (
    <div className="w-full">
      {/* Progress line background */}
      <div className="relative">
        {/* Background track */}
        <div className="absolute top-6 left-0 right-0 h-1 bg-slate-700/50 rounded-full mx-12" />

        {/* Progress fill */}
        <div
          className="absolute top-6 left-0 h-1 bg-gradient-to-r from-amber-500 via-violet-500 to-pink-500 rounded-full mx-12 transition-all duration-500"
          style={{ width: `calc(${(currentIndex / (STEPS.length - 1)) * 100}% - 6rem)` }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {STEPS.map((step, index) => {
            const isActive = step.id === state.currentStage;
            const isComplete = isStageComplete(step.id);
            const isAccessible = isStageAccessible(step.id);
            const isPast = index < currentIndex;

            return (
              <button
                key={step.id}
                onClick={() => handleStageClick(step.id)}
                disabled={!isAccessible}
                className={`
                  flex flex-col items-center gap-2 transition-all duration-300 group
                  ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                `}
              >
                {/* Icon circle */}
                <div
                  className={`
                    relative w-12 h-12 rounded-full flex items-center justify-center text-2xl
                    transition-all duration-300 transform
                    ${isActive
                      ? 'bg-gradient-to-br from-amber-400 via-violet-500 to-pink-500 scale-110 shadow-lg shadow-violet-500/30'
                      : isComplete || isPast
                        ? 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-700/80 border-2 border-slate-600'
                    }
                    ${isAccessible && !isActive ? 'group-hover:scale-105 group-hover:border-violet-400' : ''}
                  `}
                >
                  {isComplete && !isActive ? (
                    <span className="text-white text-lg">✓</span>
                  ) : (
                    <span className={isActive || isPast ? '' : 'opacity-60'}>{step.icon}</span>
                  )}

                  {/* Pulse animation for active */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-full bg-violet-400/30 animate-ping" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={`
                    text-sm font-medium transition-colors duration-300
                    ${isActive
                      ? 'text-white'
                      : isComplete || isPast
                        ? 'text-emerald-400'
                        : 'text-slate-500'
                    }
                  `}
                >
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
