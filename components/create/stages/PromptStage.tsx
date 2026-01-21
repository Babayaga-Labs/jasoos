'use client';

import { useWizard } from '../wizard/WizardContext';

export function PromptStage() {
  const { state, dispatch, canGenerateScaffold } = useWizard();
  const isGenerating = state.scaffoldGenerating;

  const handleGenerateFoundation = async () => {
    if (!canGenerateScaffold || isGenerating) return;

    dispatch({ type: 'START_SCAFFOLD' });

    try {
      const response = await fetch('/api/ugc/generate-scaffold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ premise: state.premise }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate foundation');
      }

      const data = await response.json();
      dispatch({ type: 'COMPLETE_SCAFFOLD', scaffold: data.scaffold || data });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        error: error instanceof Error ? error.message : 'Failed to generate foundation',
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white mb-3">
          What&apos;s your mystery about?
        </h2>
        <p className="text-slate-400 text-lg">
          Describe your mystery idea in a few sentences. We&apos;ll help you build the rest.
        </p>
      </div>

      {/* Prompt Input */}
      <div className="space-y-6">
        <div className="relative">
          <textarea
            value={state.premise}
            onChange={(e) => dispatch({ type: 'SET_PREMISE', premise: e.target.value })}
            placeholder="A Victorian-era murder mystery set in a grand English manor. The wealthy patriarch is found dead during a stormy dinner party, and each guest has a secret motive..."
            rows={6}
            className="w-full px-5 py-4 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none text-lg"
            disabled={isGenerating}
          />
          <div className="absolute bottom-3 right-3 text-sm text-slate-500">
            {state.premise.length} characters
          </div>
        </div>

        {/* Generate Button */}
        <div className="pt-4">
          <button
            onClick={handleGenerateFoundation}
            disabled={!canGenerateScaffold || isGenerating}
            className={`
              w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300
              ${canGenerateScaffold && !isGenerating
                ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 hover:scale-[1.02]'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            Generate Mystery Foundation
          </button>
        </div>

        {/* Helper text */}
        <p className="text-center text-sm text-slate-500">
          We&apos;ll generate a title, synopsis, setting, and suggested characters based on your idea.
          You can edit everything on the next page.
        </p>
      </div>
    </div>
  );
}
