'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useWizard } from '../wizard/WizardContext';
import type { UGCGeneratedClue, UGCGeneratedCharacter } from '@/packages/ai/types/ugc-types';

interface ValidationWarning {
  category: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  suggestion?: string;
}

type ModalStep = 'preview' | 'validating' | 'warnings' | 'publishing';

export function CluesStage() {
  const { state, dispatch, canPublish } = useWizard();
  const {
    storyId,
    clues,
    timeline,
    solution,
    generatedCharacters,
    foundation,
    timelineRegenerating,
    sceneGenerating,
    isPublishing,
    minimumPointsToAccuse,
    perfectScoreThreshold,
  } = state;

  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>('preview');
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([]);
  const [publishProgress, setPublishProgress] = useState<{ step: string; progress: number } | null>(null);

  if (clues.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">No clues generated yet. Complete the characters stage first.</p>
        <button
          onClick={() => dispatch({ type: 'GO_TO_STAGE', stage: 'characters' })}
          className="mt-4 px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
        >
          Go to Characters
        </button>
      </div>
    );
  }

  const handleRegenerateTimeline = async () => {
    if (!solution || !foundation) return;

    dispatch({ type: 'START_TIMELINE_REGEN' });

    try {
      const response = await fetch('/api/ugc/regenerate-timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clues,
          characters: generatedCharacters,
          solution,
          setting: foundation.setting,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to regenerate timeline');
      }

      const result = await response.json();
      dispatch({ type: 'COMPLETE_TIMELINE_REGEN', timeline: result.timeline });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        error: error instanceof Error ? error.message : 'Failed to regenerate timeline',
      });
    }
  };

  const handleOpenPublishModal = () => {
    setShowPublishModal(true);
    setModalStep('preview');
    setValidationWarnings([]);
    setPublishProgress(null);
  };

  const handleRunValidation = async () => {
    setModalStep('validating');

    try {
      const response = await fetch('/api/ugc/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characters: generatedCharacters,
          clues,
          timeline,
          solution,
          scoring: {
            minimumPointsToAccuse,
            perfectScoreThreshold,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Validation failed');
      }

      const result = await response.json();
      setValidationWarnings(result.warnings || []);
      setModalStep('warnings');
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        error: error instanceof Error ? error.message : 'Validation failed',
      });
      setShowPublishModal(false);
    }
  };

  const handleConfirmPublish = async () => {
    if (!foundation || !solution || !storyId) return;

    setModalStep('publishing');
    dispatch({ type: 'START_PUBLISH' });
    setPublishProgress({ step: 'Starting...', progress: 0 });

    try {
      const response = await fetch('/api/ugc/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          foundation,
          characters: generatedCharacters,
          clues,
          timeline,
          solution,
          scoring: {
            minimumPointsToAccuse,
            perfectScoreThreshold,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to publish');
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

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
            const data = JSON.parse(line.slice(6));
            if (data.type === 'progress') {
              setPublishProgress({ step: data.message, progress: data.progress });
            } else if (data.type === 'complete') {
              dispatch({ type: 'COMPLETE_PUBLISH', storyId: data.storyId });
              if (data.sceneImageUrl) {
                dispatch({ type: 'COMPLETE_SCENE_GEN', imageUrl: data.sceneImageUrl });
              }
              // Redirect to play the story
              window.location.href = `/game/${data.storyId}`;
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          }
        }
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        error: error instanceof Error ? error.message : 'Failed to publish',
      });
      setShowPublishModal(false);
    }
  };

  const criticalCount = validationWarnings.filter(w => w.severity === 'critical').length;
  const warningCount = validationWarnings.filter(w => w.severity === 'warning').length;
  const infoCount = validationWarnings.filter(w => w.severity === 'info').length;

  const culprit = generatedCharacters.find(c => c.isGuilty);
  const victim = generatedCharacters.find(c => c.isVictim);
  const totalPoints = clues.reduce((sum, c) => sum + c.points, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-3">
          Clues & Timeline
        </h2>
        <p className="text-slate-400">
          Review your clues and timeline. Edit as needed, then publish your mystery.
        </p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Clues */}
        <div className="flex flex-col" style={{ minHeight: '600px' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">Clues</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRegenerateTimeline}
                disabled={timelineRegenerating}
                className="px-4 py-2 bg-violet-500/20 text-violet-400 rounded-lg hover:bg-violet-500/30 transition-colors text-sm disabled:opacity-50"
              >
                {timelineRegenerating ? 'Regenerating...' : 'Regenerate Timeline'}
              </button>
              <button
                onClick={() => dispatch({ type: 'ADD_CLUE' })}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm"
              >
                + Add Clue
              </button>
            </div>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto pr-2">
            {clues.map((clue) => (
              <ClueCard
                key={clue.id}
                clue={clue}
                characters={generatedCharacters}
                onUpdate={(updates) => dispatch({ type: 'UPDATE_CLUE', id: clue.id, updates })}
                onDelete={() => dispatch({ type: 'DELETE_CLUE', id: clue.id })}
              />
            ))}
          </div>
        </div>

        {/* Right: Character Tabs + Timeline */}
        <div className="flex flex-col space-y-4" style={{ minHeight: '600px' }}>
          {/* Character Reference Tabs */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Character Reference</h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {generatedCharacters.map((char) => (
                <button
                  key={char.id}
                  onClick={() => setSelectedCharacter(selectedCharacter === char.id ? null : char.id)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg transition-all shrink-0
                    ${selectedCharacter === char.id
                      ? 'bg-violet-500/20 border border-violet-500'
                      : 'bg-slate-700/50 border border-slate-600 hover:border-slate-500'
                    }
                    ${char.isGuilty ? 'ring-1 ring-red-500' : ''}
                  `}
                >
                  <div className="w-8 h-8 rounded-full bg-slate-600 overflow-hidden relative">
                    {char.imageUrl ? (
                      <Image src={char.imageUrl} alt={char.name} fill className="object-cover" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-xs">👤</span>
                    )}
                  </div>
                  <span className="text-sm text-white">{char.name}</span>
                  {char.isGuilty && <span className="text-xs text-red-400">*</span>}
                </button>
              ))}
            </div>

            {/* Selected Character Details - Simplified */}
            {selectedCharacter && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                {(() => {
                  const char = generatedCharacters.find((c) => c.id === selectedCharacter);
                  if (!char) return null;
                  return (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-600 overflow-hidden relative shrink-0">
                        {char.imageUrl ? (
                          <Image src={char.imageUrl} alt={char.name} fill className="object-cover" />
                        ) : (
                          <span className="absolute inset-0 flex items-center justify-center text-sm">👤</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{char.name}</p>
                        <p className="text-xs text-slate-400">{char.role}</p>
                      </div>
                      {char.isGuilty && (
                        <span className="ml-auto px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">
                          Culprit
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 flex-1 flex flex-col">
            <h3 className="text-lg font-semibold text-white mb-4">Timeline</h3>

            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              {timeline.map((event, index) => (
                <div key={index} className="flex items-start gap-3 group">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-violet-500" />
                    {index < timeline.length - 1 && (
                      <div className="w-0.5 h-full bg-slate-700" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <textarea
                      value={event}
                      onChange={(e) =>
                        dispatch({ type: 'UPDATE_TIMELINE_EVENT', index, value: e.target.value })
                      }
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                    />
                    <div className="flex gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => dispatch({ type: 'ADD_TIMELINE_EVENT', afterIndex: index })}
                        className="text-xs text-slate-500 hover:text-violet-400"
                      >
                        + Add After
                      </button>
                      <button
                        onClick={() => dispatch({ type: 'DELETE_TIMELINE_EVENT', index })}
                        className="text-xs text-slate-500 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-8 border-t border-slate-800">
        <button
          onClick={() => dispatch({ type: 'GO_TO_STAGE', stage: 'characters' })}
          className="px-6 py-3 text-slate-400 hover:text-white transition-colors"
        >
          ← Back to Characters
        </button>

        <button
          onClick={handleOpenPublishModal}
          disabled={!canPublish || isPublishing || sceneGenerating}
          className={`
            py-4 px-8 rounded-xl font-semibold text-lg transition-all duration-300
            ${canPublish && !isPublishing && !sceneGenerating
              ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/30 hover:shadow-xl hover:shadow-teal-500/40 hover:scale-[1.02]'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }
          `}
        >
          Review & Publish
        </button>
      </div>

      {/* Review & Publish Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header - Only show for non-preview steps */}
            {modalStep !== 'preview' && (
              <div className="p-6 border-b border-slate-700 shrink-0">
                <h3 className="text-xl font-bold text-white">
                  {modalStep === 'publishing' ? 'Publishing...' :
                   modalStep === 'validating' ? 'Validating...' :
                   'Validation Results'}
                </h3>
              </div>
            )}

            {/* Modal Content */}
            <div className="overflow-y-auto flex-1">
              {/* Netflix-style Preview Step */}
              {modalStep === 'preview' && foundation && (
                <div className="relative">
                  {/* Hero Banner with Character Collage Background */}
                  <div className="relative h-64 overflow-hidden">
                    {/* Background: Use first character image or gradient */}
                    {generatedCharacters.find(c => c.imageUrl)?.imageUrl ? (
                      <div className="absolute inset-0">
                        <Image
                          src={generatedCharacters.find(c => c.imageUrl)!.imageUrl!}
                          alt="Scene"
                          fill
                          className="object-cover blur-sm scale-110 opacity-40"
                        />
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-violet-900/50 via-slate-900 to-red-900/30" />
                    )}

                    {/* Gradient Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-transparent to-slate-900/80" />

                    {/* Title & Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs font-medium">
                          {foundation.crimeType}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-700/80 text-slate-300 rounded text-xs">
                          {foundation.setting.timePeriod}
                        </span>
                      </div>
                      <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">
                        {foundation.title}
                      </h2>
                      <p className="text-slate-300 text-sm line-clamp-2 max-w-2xl">
                        {foundation.synopsis}
                      </p>
                    </div>

                    {/* Character Portraits Row - Netflix style */}
                    <div className="absolute -bottom-8 right-6 flex -space-x-3">
                      {generatedCharacters.filter(c => !c.isVictim).slice(0, 5).map((char, idx) => (
                        <div
                          key={char.id}
                          className={`
                            w-16 h-16 rounded-full border-2 overflow-hidden relative shadow-xl
                            ${char.isGuilty ? 'border-red-500' : 'border-slate-700'}
                          `}
                          style={{ zIndex: 10 - idx }}
                        >
                          {char.imageUrl ? (
                            <Image src={char.imageUrl} alt={char.name} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full bg-slate-700 flex items-center justify-center text-2xl">
                              👤
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="p-6 pt-12 space-y-6">
                    {/* Setting & Location */}
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <span className="text-lg">📍</span> {foundation.setting.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-lg">🌙</span> {foundation.setting.atmosphere}
                      </span>
                    </div>

                    {/* Victim Card */}
                    {victim && (
                      <div className="bg-gradient-to-r from-red-950/50 to-slate-900/50 rounded-xl p-4 border border-red-900/30">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-full bg-slate-700 overflow-hidden relative shrink-0 border-2 border-red-500/50">
                            {victim.imageUrl ? (
                              <Image src={victim.imageUrl} alt={victim.name} fill className="object-cover grayscale" />
                            ) : (
                              <span className="absolute inset-0 flex items-center justify-center text-xl">💀</span>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-red-400 uppercase tracking-wider font-medium">The Victim</p>
                            <p className="text-white font-semibold">{victim.name}</p>
                            <p className="text-sm text-slate-400 mt-1">{foundation.victimParagraph}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Suspects Grid */}
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-medium">Suspects</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {generatedCharacters.filter(c => !c.isVictim).map((char) => (
                          <div
                            key={char.id}
                            className={`
                              group relative rounded-xl overflow-hidden border transition-all hover:scale-[1.02]
                              ${char.isGuilty
                                ? 'border-red-500/30 hover:border-red-500/50'
                                : 'border-slate-700/50 hover:border-slate-600'
                              }
                            `}
                          >
                            <div className="aspect-[3/4] relative">
                              {char.imageUrl ? (
                                <Image src={char.imageUrl} alt={char.name} fill className="object-cover" />
                              ) : (
                                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-4xl">👤</div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                              <div className="absolute bottom-0 left-0 right-0 p-3">
                                <p className="text-white font-medium text-sm">{char.name}</p>
                                <p className="text-slate-400 text-xs">{char.role}</p>
                              </div>
                              {char.isGuilty && (
                                <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-500/80 rounded text-[10px] text-white font-medium">
                                  CULPRIT
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Solution Reveal */}
                    {solution && culprit && (
                      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-medium">The Truth</p>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500 text-xs">Method</p>
                            <p className="text-slate-200">{solution.method}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs">Motive</p>
                            <p className="text-slate-200">{solution.motive}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs">Evidence Trail</p>
                            <p className="text-slate-200">{clues.length} clues • {totalPoints} pts</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Stats Bar */}
                    <div className="flex items-center justify-between py-3 border-t border-slate-800">
                      <div className="flex items-center gap-6 text-sm">
                        <span className="text-slate-400">
                          <span className="text-white font-semibold">{generatedCharacters.filter(c => !c.isVictim).length}</span> suspects
                        </span>
                        <span className="text-slate-400">
                          <span className="text-white font-semibold">{clues.length}</span> clues
                        </span>
                        <span className="text-slate-400">
                          <span className="text-white font-semibold">{timeline.length}</span> timeline events
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Validating Step */}
              {modalStep === 'validating' && (
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <svg className="animate-spin h-12 w-12 text-violet-500 mb-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-slate-300">Checking your mystery for issues...</p>
                </div>
              )}

              {/* Warnings Step */}
              {modalStep === 'warnings' && (
                <div className="space-y-4 p-6">
                  {validationWarnings.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-4xl">✓</span>
                      </div>
                      <p className="text-lg text-white mb-2">All checks passed!</p>
                      <p className="text-sm text-slate-400">Your mystery is ready to publish.</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-slate-300">
                        We found some potential issues. You can still publish, but you may want to review these:
                      </p>

                      {/* Warning Summary */}
                      <div className="flex gap-4 text-sm">
                        {criticalCount > 0 && (
                          <span className="px-3 py-1 bg-red-900/30 text-red-400 rounded-full">
                            {criticalCount} critical
                          </span>
                        )}
                        {warningCount > 0 && (
                          <span className="px-3 py-1 bg-amber-900/30 text-amber-400 rounded-full">
                            {warningCount} warnings
                          </span>
                        )}
                        {infoCount > 0 && (
                          <span className="px-3 py-1 bg-slate-700 text-slate-400 rounded-full">
                            {infoCount} info
                          </span>
                        )}
                      </div>

                      {/* Warning List */}
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {validationWarnings.map((warning, i) => (
                          <div
                            key={i}
                            className={`p-3 rounded-lg border ${
                              warning.severity === 'critical'
                                ? 'bg-red-900/20 border-red-500/30'
                                : warning.severity === 'warning'
                                  ? 'bg-amber-900/20 border-amber-500/30'
                                  : 'bg-slate-700/50 border-slate-600'
                            }`}
                          >
                            <p className={`text-sm ${
                              warning.severity === 'critical'
                                ? 'text-red-300'
                                : warning.severity === 'warning'
                                  ? 'text-amber-300'
                                  : 'text-slate-300'
                            }`}>
                              {warning.message}
                            </p>
                            {warning.suggestion && (
                              <p className="text-xs text-slate-500 mt-1">{warning.suggestion}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Publishing Step */}
              {modalStep === 'publishing' && publishProgress && (
                <div className="space-y-4 py-8 px-6">
                  <p className="text-slate-300 text-center">{publishProgress.step}</p>
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 transition-all duration-500"
                      style={{ width: `${publishProgress.progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-500 text-center">{publishProgress.progress}%</p>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end shrink-0">
              {modalStep === 'preview' && (
                <>
                  <button
                    onClick={() => setShowPublishModal(false)}
                    className="px-6 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRunValidation}
                    className="px-6 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-lg hover:from-violet-600 hover:to-purple-600 transition-all"
                  >
                    Run Validation
                  </button>
                </>
              )}

              {modalStep === 'validating' && (
                <button
                  disabled
                  className="px-6 py-2 bg-slate-700 text-slate-500 rounded-lg cursor-not-allowed"
                >
                  Validating...
                </button>
              )}

              {modalStep === 'warnings' && (
                <>
                  <button
                    onClick={() => setShowPublishModal(false)}
                    className="px-6 py-2 text-slate-400 hover:text-white transition-colors"
                  >
                    Go Back & Fix
                  </button>
                  <button
                    onClick={handleConfirmPublish}
                    className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 transition-all"
                  >
                    {validationWarnings.length > 0 ? 'Publish Anyway' : 'Publish Now'}
                  </button>
                </>
              )}

              {modalStep === 'publishing' && (
                <button
                  disabled
                  className="px-6 py-2 bg-slate-700 text-slate-500 rounded-lg cursor-not-allowed"
                >
                  Publishing...
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ClueCardProps {
  clue: UGCGeneratedClue;
  characters: UGCGeneratedCharacter[];
  onUpdate: (updates: Partial<UGCGeneratedClue>) => void;
  onDelete: () => void;
}

function ClueCard({ clue, characters, onUpdate, onDelete }: ClueCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 space-y-3">
      {/* Description */}
      <textarea
        value={clue.description}
        onChange={(e) => onUpdate({ description: e.target.value })}
        rows={2}
        placeholder="Clue description..."
        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
      />

      {/* Points */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">Points:</label>
          <input
            type="number"
            value={clue.points}
            onChange={(e) => onUpdate({ points: parseInt(e.target.value) || 0 })}
            className="w-16 px-2 py-1 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-slate-400 hover:text-white"
        >
          {isExpanded ? 'Hide Details' : 'Show Details'}
        </button>

        <button
          onClick={onDelete}
          className="ml-auto text-sm text-slate-500 hover:text-red-400"
        >
          Delete
        </button>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="pt-3 border-t border-slate-700">
          {/* Revealed By */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">Revealed By:</label>
            <div className="flex flex-wrap gap-2">
              {characters.map((char) => (
                <button
                  key={char.id}
                  onClick={() => {
                    const isSelected = clue.revealedBy.includes(char.id);
                    onUpdate({
                      revealedBy: isSelected
                        ? clue.revealedBy.filter((id) => id !== char.id)
                        : [...clue.revealedBy, char.id],
                    });
                  }}
                  className={`
                    px-3 py-1 rounded-lg text-sm transition-all
                    ${clue.revealedBy.includes(char.id)
                      ? 'bg-violet-500/20 text-violet-400 border border-violet-500'
                      : 'bg-slate-700 text-slate-400 border border-slate-600 hover:border-slate-500'
                    }
                  `}
                >
                  {char.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
