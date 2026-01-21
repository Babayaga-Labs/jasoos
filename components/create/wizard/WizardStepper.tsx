'use client';

import { useWizard, type WizardStage } from './WizardContext';

interface StepConfig {
  id: WizardStage;
  label: string;
  shortLabel: string;
}

const STEPS: StepConfig[] = [
  { id: 'prompt', label: 'Your Idea', shortLabel: 'Idea' },
  { id: 'foundation', label: 'Mystery Foundation', shortLabel: 'Foundation' },
  { id: 'characters', label: 'Characters', shortLabel: 'Characters' },
  { id: 'clues', label: 'Clues & Publish', shortLabel: 'Clues' },
];

const STAGE_ORDER: WizardStage[] = ['prompt', 'foundation', 'characters', 'clues'];

export function WizardStepper() {
  const { state, dispatch, canProceedFromFoundation, canProceedFromCharacters } = useWizard();

  const currentIndex = STAGE_ORDER.indexOf(state.currentStage);

  const isStageAccessible = (stage: WizardStage): boolean => {
    const targetIndex = STAGE_ORDER.indexOf(stage);

    // Can always go back
    if (targetIndex < currentIndex) return true;

    // Current stage is always accessible
    if (targetIndex === currentIndex) return true;

    // Forward navigation rules
    switch (stage) {
      case 'foundation':
        return state.foundation !== null; // Can go to foundation after scaffold is generated
      case 'characters':
        return state.hasGeneratedOnce; // Can go to characters after generation
      case 'clues':
        return state.hasGeneratedOnce && state.generatedCharacters.length >= 3;
      default:
        return true;
    }
  };

  const isStageComplete = (stage: WizardStage): boolean => {
    switch (stage) {
      case 'prompt':
        return state.foundation !== null;
      case 'foundation':
        return canProceedFromFoundation && state.hasGeneratedOnce;
      case 'characters':
        return canProceedFromCharacters;
      case 'clues':
        return state.isPublished === true;
    }
  };

  const handleStageClick = (stage: WizardStage) => {
    if (isStageAccessible(stage)) {
      dispatch({ type: 'GO_TO_STAGE', stage });
    }
  };

  return (
    <div className="w-full">
      <div className="relative flex justify-between items-start">
        {STEPS.map((step, index) => {
          const isActive = step.id === state.currentStage;
          const isComplete = isStageComplete(step.id);
          const isAccessible = isStageAccessible(step.id);
          const isPast = index < currentIndex;
          const isLastStep = index === STEPS.length - 1;

          return (
            <div key={step.id} className="flex flex-col items-center relative flex-1">
              {/* Connector line to next step */}
              {!isLastStep && (
                <div className="absolute top-6 left-1/2 w-full h-0.5 -translate-y-1/2">
                  <div className={`
                    h-full transition-colors duration-300
                    ${isPast || isComplete ? 'bg-violet-500' : 'bg-slate-700/50'}
                  `} />
                </div>
              )}

              <button
                onClick={() => handleStageClick(step.id)}
                disabled={!isAccessible}
                className={`
                  flex flex-col items-center gap-2 transition-all duration-300 group relative z-10
                  ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                `}
              >
                {/* Step number circle */}
                <div
                  className={`
                    relative w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold
                    transition-all duration-300 transform
                    ${isActive
                      ? 'bg-violet-500 scale-110 shadow-lg shadow-violet-500/30 text-white'
                      : isComplete || isPast
                        ? 'bg-violet-500 shadow-md shadow-violet-500/20 text-white'
                        : 'bg-slate-800 border-2 border-slate-600 text-slate-400'
                    }
                    ${isAccessible && !isActive ? 'group-hover:scale-105 group-hover:border-violet-400' : ''}
                  `}
                >
                  {isComplete && !isActive ? (
                    <span className="text-white text-lg">✓</span>
                  ) : (
                    <span>{index + 1}</span>
                  )}

                  {/* Pulse animation for active */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-full bg-violet-400/30 animate-ping" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={`
                    text-sm font-medium transition-colors duration-300 hidden sm:block
                    ${isActive
                      ? 'text-white'
                      : isComplete || isPast
                        ? 'text-violet-400'
                        : 'text-slate-500'
                    }
                  `}
                >
                  {step.label}
                </span>
                <span
                  className={`
                    text-sm font-medium transition-colors duration-300 sm:hidden
                    ${isActive
                      ? 'text-white'
                      : isComplete || isPast
                        ? 'text-violet-400'
                        : 'text-slate-500'
                    }
                  `}
                >
                  {step.shortLabel}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
