'use client';

import { useWizard } from '../wizard/WizardContext';
import { ClueCard, ClueSummary } from '../cards/ClueCard';
import { SkeletonCard } from '../cards/FadeInCard';
import { CRIME_TYPES } from '@/packages/ai/types/ugc-types';

export function CluesStage() {
  const {
    state,
    dispatch,
    canProceedFromClues,
    completedCharacters,
    nonVictimCharacters,
  } = useWizard();

  const {
    crimeInput,
    generatedStory,
    generatedPlotPoints,
    minimumPointsToAccuse,
    perfectScoreThreshold,
    cluesGenerating,
    cluesComplete,
  } = state;

  const handleInputChange = (field: keyof typeof crimeInput, value: string) => {
    dispatch({ type: 'UPDATE_CRIME_INPUT', field, value });
  };

  const handleGenerate = async () => {
    dispatch({ type: 'START_CLUES_GENERATION' });

    try {
      const response = await fetch('/api/ugc/generate-clues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crimeInput,
          story: generatedStory,
          characters: completedCharacters,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate clues');
      }

      dispatch({
        type: 'COMPLETE_CLUES_GENERATION',
        plotPoints: data.plotPoints,
        minPoints: data.minimumPointsToAccuse,
        perfectScore: data.perfectScoreThreshold,
        updatedStory: data.updatedStory,
        updatedCharacters: data.updatedCharacters,
      });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        error: error instanceof Error ? error.message : 'Clues generation failed',
      });
    }
  };

  const handleProceed = () => {
    dispatch({ type: 'GO_TO_STAGE', stage: 'world' });
  };

  const handleBack = () => {
    dispatch({ type: 'GO_TO_STAGE', stage: 'characters' });
  };

  const isFormValid =
    crimeInput.crimeType &&
    crimeInput.culpritId &&
    crimeInput.motive.trim() &&
    crimeInput.method.trim();

  // Culprit options - exclude victims
  const culpritOptions = nonVictimCharacters;

  // Show form if not yet generated
  if (!cluesComplete && !cluesGenerating) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-3">
            Define the Crime
          </h2>
          <p className="text-slate-400">
            Who did it? Why? And how? The clues will be generated based on these details.
          </p>
        </div>

        <div className="space-y-6">
          {/* Crime Type */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Type of Crime
            </label>
            <select
              value={crimeInput.crimeType}
              onChange={(e) => handleInputChange('crimeType', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
            >
              {CRIME_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Culprit Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              The Culprit
              <span className="text-slate-500 font-normal ml-2">(Who committed the crime?)</span>
            </label>
            <div className="grid grid-cols-1 gap-3">
              {culpritOptions.map((char) => (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => handleInputChange('culpritId', char.tempId)}
                  className={`
                    flex items-center gap-4 p-4 rounded-xl border transition-all text-left
                    ${crimeInput.culpritId === char.tempId
                      ? 'bg-red-500/20 border-red-500/50'
                      : 'bg-slate-800/30 border-slate-700/30 hover:border-slate-600'
                    }
                  `}
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center overflow-hidden">
                    {char.imageUrl ? (
                      <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">👤</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${crimeInput.culpritId === char.tempId ? 'text-red-300' : 'text-white'}`}>
                      {char.name}
                    </p>
                    <p className="text-sm text-slate-400">{char.role}</p>
                  </div>
                  {crimeInput.culpritId === char.tempId && (
                    <span className="px-3 py-1 rounded-full bg-red-500/30 text-red-300 text-xs font-bold">
                      GUILTY
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Motive */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Motive
              <span className="text-slate-500 font-normal ml-2">(Why did they do it?)</span>
            </label>
            <textarea
              value={crimeInput.motive}
              onChange={(e) => handleInputChange('motive', e.target.value)}
              placeholder="Greed drove them to eliminate the only person who knew about the hidden inheritance..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all resize-none"
            />
          </div>

          {/* Method */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Method
              <span className="text-slate-500 font-normal ml-2">(How did they commit the crime?)</span>
            </label>
            <textarea
              value={crimeInput.method}
              onChange={(e) => handleInputChange('method', e.target.value)}
              placeholder="Slipped poison into the victim's evening drink during the confusion of the party..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all resize-none"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!isFormValid}
            className={`
              w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all transform
              ${isFormValid
                ? 'bg-gradient-to-r from-amber-500 via-violet-500 to-pink-500 text-white hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98]'
                : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            Generate Clues & Evidence
          </button>
        </div>
      </div>
    );
  }

  // Show generating state
  if (cluesGenerating) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-slate-800/50 border border-violet-500/30 mb-4">
            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-violet-300 font-medium">Generating clues and evidence...</span>
          </div>
          <p className="text-slate-500">Creating a web of evidence for players to uncover</p>
        </div>

        <div className="grid gap-4">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  // Show generated results
  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-3">
          Evidence & Clues
        </h2>
        <p className="text-slate-400">
          Players will discover these through interrogation
        </p>
      </div>

      {generatedPlotPoints && (
        <div className="space-y-6">
          {/* Summary */}
          <ClueSummary
            plotPoints={generatedPlotPoints}
            minimumPointsToAccuse={minimumPointsToAccuse}
            perfectScoreThreshold={perfectScoreThreshold}
            delay={0}
          />

          {/* Clue cards */}
          <div className="space-y-4">
            {generatedPlotPoints.map((pp, index) => (
              <ClueCard
                key={pp.id}
                plotPoint={pp}
                characters={completedCharacters}
                delay={100 + index * 80}
              />
            ))}
          </div>

          {/* Navigation */}
          <div
            className="flex items-center gap-4 pt-6 opacity-0 animate-fade-in-up"
            style={{ animationDelay: `${100 + generatedPlotPoints.length * 80 + 200}ms`, animationFillMode: 'forwards' }}
          >
            <button
              onClick={handleBack}
              className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
            >
              ← Back to Characters
            </button>

            <button
              onClick={handleProceed}
              disabled={!canProceedFromClues}
              className="flex-1 py-4 px-6 rounded-xl font-semibold text-lg bg-gradient-to-r from-amber-500 via-violet-500 to-pink-500 text-white hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98] transition-all transform"
            >
              Continue to World
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
