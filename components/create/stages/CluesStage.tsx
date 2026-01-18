'use client';

import { useState } from 'react';
import { useWizard } from '../wizard/WizardContext';
import { ClueCard, ClueSummary } from '../cards/ClueCard';
import { SkeletonCard } from '../cards/FadeInCard';
import { TimelineSection, CharacterKnowledgeSection, SolutionSection } from '../cards/StoryBible';
import { CRIME_TYPES } from '@/packages/ai/types/ugc-types';
import type { UGCScaffoldFormInput, ScaffoldGenerateSSEEvent } from '@/packages/ai/types/ugc-types';
import type { ValidationWarning } from '@/packages/ai';

// ============================================================================
// Validation Results Component
// ============================================================================

function ValidationResults({ warnings }: { warnings: ValidationWarning[] }) {
  const criticalCount = warnings.filter(w => w.severity === 'critical').length;
  const warningCount = warnings.filter(w => w.severity === 'warning').length;
  const infoCount = warnings.filter(w => w.severity === 'info').length;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '⚠️';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-300';
      case 'warning': return 'text-amber-200';
      case 'info': return 'text-blue-200';
      default: return 'text-amber-200';
    }
  };

  return (
    <div className={`p-4 rounded-xl ${criticalCount > 0 ? 'bg-red-500/10 border border-red-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
      <div className="flex items-center gap-3 mb-3">
        <span className="text-lg">🔍</span>
        <span className={`font-semibold ${criticalCount > 0 ? 'text-red-300' : 'text-amber-300'}`}>
          Validation Results
        </span>
        <div className="flex gap-2">
          {criticalCount > 0 && <span className="px-1.5 py-0.5 rounded bg-red-500/30 text-red-300 text-xs">{criticalCount} critical</span>}
          {warningCount > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-300 text-xs">{warningCount} warnings</span>}
          {infoCount > 0 && <span className="px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-300 text-xs">{infoCount} info</span>}
        </div>
      </div>
      <div className="space-y-2">
        {warnings.map((warning, index) => (
          <div key={index} className={`flex items-start gap-2 text-sm ${getSeverityColor(warning.severity)}`}>
            <span className="flex-shrink-0">{getSeverityIcon(warning.severity)}</span>
            <div className="flex-1">
              <span>{warning.message}</span>
              {warning.suggestion && (
                <p className="text-xs text-slate-400 mt-0.5">💡 {warning.suggestion}</p>
              )}
            </div>
            <span className="px-1.5 py-0.5 rounded bg-slate-700/50 text-xs text-slate-400 capitalize">
              {warning.category}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Scaffold Flow - Crime Details & Final Generation
// ============================================================================

function ScaffoldCluesStage() {
  const {
    state,
    dispatch,
    canGenerateFinal,
    selectedCulprit,
    completedScaffoldCharacters,
    completedCharacters,
    canProceedFromClues,
  } = useWizard();

  const {
    scaffold,
    scaffoldCharacters,
    initialPremise,
    crimeDetails,
    finalGenerating,
    cluesComplete,
    generatedPlotPoints,
    minimumPointsToAccuse,
    perfectScoreThreshold,
  } = state;

  const [generationProgress, setGenerationProgress] = useState<{
    step: string;
    message: string;
    progress: number;
  } | null>(null);

  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[] | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'characters' | 'clues' | 'validate'>('timeline');

  const handleValidate = async () => {
    if (!state.generatedStory || !state.generatedPlotPoints) return;

    setIsValidating(true);
    try {
      const response = await fetch('/api/ugc/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story: state.generatedStory,
          characters: completedCharacters,
          plotPoints: {
            plotPoints: state.generatedPlotPoints,
            minimumPointsToAccuse: minimumPointsToAccuse,
            perfectScoreThreshold: perfectScoreThreshold,
          },
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setValidationWarnings(result.warnings);
      } else {
        console.error('Validation failed:', result.error);
      }
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleCrimeDetailsChange = (field: 'motive' | 'method', value: string) => {
    dispatch({ type: 'UPDATE_CRIME_DETAILS', field, value });
  };

  const handleGenerate = async () => {
    if (!scaffold || !selectedCulprit) return;

    dispatch({ type: 'START_FINAL_GENERATION' });

    try {
      // Build the scaffold form input
      const scaffoldFormInput: UGCScaffoldFormInput = {
        initialPremise,
        scaffold,
        characters: scaffoldCharacters.filter(c => c.isComplete).map(c => ({
          fromSuggestionId: c.suggestionId,
          tempId: c.suggestionId,
          name: c.name,
          role: c.role,
          appearance: c.appearance,
          personalityTraits: c.personalityTraits,
          secret: c.secret,
          isCulprit: c.isCulprit,
          uploadedImageUrl: c.uploadedImageUrl,
        })),
        crimeDetails: {
          motive: crimeDetails.motive,
          method: crimeDetails.method,
        },
      };

      const response = await fetch('/api/ugc/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scaffoldFormInput }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start generation');
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

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
              const event: ScaffoldGenerateSSEEvent = JSON.parse(line.slice(6));

              if (event.type === 'progress') {
                setGenerationProgress({
                  step: event.step,
                  message: event.message,
                  progress: event.progress,
                });
              } else if (event.type === 'complete') {
                dispatch({
                  type: 'COMPLETE_FINAL_GENERATION',
                  story: event.data.story,
                  characters: event.data.characters,
                  plotPoints: event.data.plotPoints.plotPoints,
                  minPoints: event.data.plotPoints.minimumPointsToAccuse,
                  perfectScore: event.data.plotPoints.perfectScoreThreshold,
                  storyId: event.storyId,
                });
                setGenerationProgress(null);
              } else if (event.type === 'error') {
                throw new Error(event.message);
              }
            } catch (parseError) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        error: error instanceof Error ? error.message : 'Generation failed',
      });
      setGenerationProgress(null);
    }
  };

  const handleProceed = () => {
    dispatch({ type: 'GO_TO_STAGE', stage: 'world' });
  };

  const handleBack = () => {
    dispatch({ type: 'GO_TO_STAGE', stage: 'characters' });
  };

  // Show generating state with progress
  if (finalGenerating) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-slate-800/50 border border-violet-500/30 mb-4">
            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-violet-300 font-medium">
              {generationProgress?.message || 'Initializing generation...'}
            </span>
          </div>
          {generationProgress && (
            <div className="mt-4 max-w-md mx-auto">
              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <span>{generationProgress.step}</span>
                <span>{generationProgress.progress}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${generationProgress.progress}%` }}
                />
              </div>
            </div>
          )}
          <p className="text-slate-500 mt-4">
            Building timeline from character secrets, generating clues, and creating roleplay prompts...
          </p>
        </div>

        <div className="grid gap-4">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  // Show generated results with tabbed layout
  if (cluesComplete && generatedPlotPoints) {
    const tabs = [
      { id: 'timeline' as const, label: 'Timeline', icon: '📅', count: state.generatedStory?.actualEvents.length },
      { id: 'characters' as const, label: 'Characters', icon: '👥', count: completedCharacters.length },
      { id: 'clues' as const, label: 'Clues', icon: '🔎', count: generatedPlotPoints.length },
      { id: 'validate' as const, label: 'Validate', icon: '✓', count: validationWarnings?.length },
    ];

    return (
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-white mb-2">
            Review Your Mystery
          </h2>
          <p className="text-slate-400 text-sm">
            Check each section before publishing
          </p>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-2 mb-6 p-1 rounded-xl bg-slate-800/50 border border-slate-700/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all
                ${activeTab === tab.id
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }
              `}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                  tab.id === 'validate' && validationWarnings && validationWarnings.some(w => w.severity === 'critical')
                    ? 'bg-red-500/30 text-red-300'
                    : 'bg-slate-700/50 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'timeline' && (
            <div className="p-4 rounded-xl bg-slate-800/20 border border-slate-700/30">
              <TimelineSection />
            </div>
          )}

          {activeTab === 'characters' && (
            <div className="p-4 rounded-xl bg-slate-800/20 border border-slate-700/30">
              <CharacterKnowledgeSection />
            </div>
          )}

          {activeTab === 'clues' && (
            <div className="space-y-6">
              <ClueSummary
                plotPoints={generatedPlotPoints}
                minimumPointsToAccuse={minimumPointsToAccuse}
                perfectScoreThreshold={perfectScoreThreshold}
                delay={0}
              />
              <div className="space-y-4">
                {generatedPlotPoints.map((pp, index) => (
                  <ClueCard
                    key={pp.id}
                    plotPoint={pp}
                    characters={completedCharacters}
                    delay={0}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'validate' && (
            <div className="space-y-6">
              {/* Validate Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleValidate}
                  disabled={isValidating}
                  className={`
                    flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
                    ${isValidating
                      ? 'bg-slate-700/50 text-slate-400 cursor-wait'
                      : 'bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30 hover:border-violet-500/50'
                    }
                  `}
                >
                  {isValidating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {validationWarnings ? 'Re-validate' : 'Run Validation'}
                    </>
                  )}
                </button>
              </div>

              {/* Validation Results */}
              {validationWarnings && validationWarnings.length > 0 && (
                <ValidationResults warnings={validationWarnings} />
              )}

              {validationWarnings && validationWarnings.length === 0 && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <span className="text-emerald-300">All checks passed! Your mystery is ready.</span>
                </div>
              )}

              {/* Solution Preview */}
              <div className="p-4 rounded-xl bg-slate-800/20 border border-slate-700/30">
                <SolutionSection />
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-4 pt-4">
                <button
                  onClick={handleBack}
                  className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
                >
                  ← Back
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
      </div>
    );
  }

  // Show crime details form
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white mb-3">
          Crime Details
        </h2>
        <p className="text-slate-400">
          Define the motive and method. The timeline will be generated based on character secrets.
        </p>
      </div>

      <div className="space-y-6">
        {/* Crime Type (from scaffold, read-only) */}
        {scaffold && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Type of Crime
            </label>
            <div className="px-4 py-3 rounded-xl bg-slate-800/30 border border-slate-700/30 text-slate-300">
              {scaffold.crimeType.charAt(0).toUpperCase() + scaffold.crimeType.slice(1)}
            </div>
          </div>
        )}

        {/* Selected Culprit (from CharactersStage, read-only) */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            The Culprit
            <span className="text-slate-500 font-normal ml-2">(selected in Characters stage)</span>
          </label>
          {selectedCulprit ? (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-red-500/20 border border-red-500/50">
              <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center overflow-hidden">
                {selectedCulprit.uploadedImageUrl ? (
                  <img
                    src={selectedCulprit.uploadedImageUrl}
                    alt={selectedCulprit.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">👤</span>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-red-300">{selectedCulprit.name}</p>
                <p className="text-sm text-slate-400">{selectedCulprit.role}</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-red-500/30 text-red-300 text-xs font-bold">
                GUILTY
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300">
              No culprit selected. Go back to Characters and mark one as the culprit.
            </div>
          )}
        </div>

        {/* Motive */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Motive
            <span className="text-slate-500 font-normal ml-2">(Why did they do it?)</span>
          </label>
          <textarea
            value={crimeDetails.motive}
            onChange={(e) => handleCrimeDetailsChange('motive', e.target.value)}
            placeholder="Greed drove them to eliminate the only person who knew about the hidden inheritance..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all resize-none"
          />
          {selectedCulprit?.potentialMotive && (
            <p className="text-xs text-slate-500 mt-2">
              Suggested: {selectedCulprit.potentialMotive}
            </p>
          )}
        </div>

        {/* Method */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Method
            <span className="text-slate-500 font-normal ml-2">(How did they commit the crime?)</span>
          </label>
          <textarea
            value={crimeDetails.method}
            onChange={(e) => handleCrimeDetailsChange('method', e.target.value)}
            placeholder="Slipped poison into the victim's evening drink during the confusion of the party..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all resize-none"
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-4 pt-4">
          <button
            onClick={handleBack}
            className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
          >
            ← Back
          </button>

          <button
            onClick={handleGenerate}
            disabled={!canGenerateFinal}
            className={`
              flex-1 py-4 px-6 rounded-xl font-semibold text-lg transition-all transform
              ${canGenerateFinal
                ? 'bg-gradient-to-r from-amber-500 via-violet-500 to-pink-500 text-white hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98]'
                : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            Generate Story & Clues
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Legacy Flow - Full Crime Definition
// ============================================================================

function LegacyCluesStage() {
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

  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[] | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'characters' | 'clues' | 'validate'>('timeline');

  const handleValidate = async () => {
    if (!generatedStory || !generatedPlotPoints) return;

    setIsValidating(true);
    try {
      const response = await fetch('/api/ugc/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story: generatedStory,
          characters: completedCharacters,
          plotPoints: {
            plotPoints: generatedPlotPoints,
            minimumPointsToAccuse,
            perfectScoreThreshold,
          },
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setValidationWarnings(result.warnings);
      } else {
        console.error('Validation failed:', result.error);
      }
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

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

  // Show generated results with tabbed layout
  if (!generatedPlotPoints) {
    return null;
  }

  const tabs = [
    { id: 'timeline' as const, label: 'Timeline', icon: '📅', count: generatedStory?.actualEvents.length },
    { id: 'characters' as const, label: 'Characters', icon: '👥', count: completedCharacters.length },
    { id: 'clues' as const, label: 'Clues', icon: '🔎', count: generatedPlotPoints.length },
    { id: 'validate' as const, label: 'Validate', icon: '✓', count: validationWarnings?.length },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">
          Review Your Mystery
        </h2>
        <p className="text-slate-400 text-sm">
          Check each section before publishing
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 mb-6 p-1 rounded-xl bg-slate-800/50 border border-slate-700/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all
              ${activeTab === tab.id
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }
            `}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                tab.id === 'validate' && validationWarnings && validationWarnings.some(w => w.severity === 'critical')
                  ? 'bg-red-500/30 text-red-300'
                  : 'bg-slate-700/50 text-slate-400'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'timeline' && (
          <div className="p-4 rounded-xl bg-slate-800/20 border border-slate-700/30">
            <TimelineSection />
          </div>
        )}

        {activeTab === 'characters' && (
          <div className="p-4 rounded-xl bg-slate-800/20 border border-slate-700/30">
            <CharacterKnowledgeSection />
          </div>
        )}

        {activeTab === 'clues' && (
          <div className="space-y-6">
            <ClueSummary
              plotPoints={generatedPlotPoints}
              minimumPointsToAccuse={minimumPointsToAccuse}
              perfectScoreThreshold={perfectScoreThreshold}
              delay={0}
            />
            <div className="space-y-4">
              {generatedPlotPoints.map((pp) => (
                <ClueCard
                  key={pp.id}
                  plotPoint={pp}
                  characters={completedCharacters}
                  delay={0}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'validate' && (
          <div className="space-y-6">
            {/* Validate Button */}
            <div className="flex justify-center">
              <button
                onClick={handleValidate}
                disabled={isValidating}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
                  ${isValidating
                    ? 'bg-slate-700/50 text-slate-400 cursor-wait'
                    : 'bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30 hover:border-violet-500/50'
                  }
                `}
              >
                {isValidating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {validationWarnings ? 'Re-validate' : 'Run Validation'}
                  </>
                )}
              </button>
            </div>

            {/* Validation Results */}
            {validationWarnings && validationWarnings.length > 0 && (
              <ValidationResults warnings={validationWarnings} />
            )}

            {validationWarnings && validationWarnings.length === 0 && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                <span className="text-emerald-300">All checks passed! Your mystery is ready.</span>
              </div>
            )}

            {/* Solution Preview */}
            <div className="p-4 rounded-xl bg-slate-800/20 border border-slate-700/30">
              <SolutionSection />
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-4 pt-4">
              <button
                onClick={handleBack}
                className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
              >
                ← Back
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
    </div>
  );
}

// ============================================================================
// Main Export - Routes to appropriate flow
// ============================================================================

export function CluesStage() {
  const { state } = useWizard();

  if (state.useScaffoldFlow) {
    return <ScaffoldCluesStage />;
  }

  return <LegacyCluesStage />;
}
