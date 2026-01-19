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
    sceneGenerating,
    sceneImageUrl,
    isPublishing,
    minimumPointsToAccuse,
    perfectScoreThreshold,
  } = state;

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
          Design Your Clues
        </h2>
        <p className="text-slate-400">
          Add clues that players will discover through interrogation. Each clue should help solve the mystery.
        </p>
        {sceneGenerating && (
          <p className="text-xs text-violet-400 mt-2 flex items-center justify-center gap-2">
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating scene image in background...
          </p>
        )}
      </div>

      {/* Side-by-Side Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Clues Section (3/5 width) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold text-white">Clues</h3>
            <button
              onClick={() => dispatch({ type: 'ADD_CLUE' })}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm"
            >
              + Add Clue
            </button>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            These clues shape how players solve your mystery. Select which characters reveal each clue during interrogation.
          </p>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
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

          {/* Scoring Summary */}
          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50 mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Total Points Available:</span>
              <span className="text-white font-medium">{totalPoints} pts</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-slate-400">Points to Accuse:</span>
              <span className="text-amber-400 font-medium">{minimumPointsToAccuse} pts</span>
            </div>
          </div>
        </div>

        {/* Right: Reference Panel (2/5 width) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Story Premise */}
          <ReferencePanel title="Story Premise">
            <p className="text-slate-300 text-sm leading-relaxed mb-3">
              {foundation?.synopsis || 'No synopsis available'}
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Setting:</span>
                <span className="text-slate-300">{foundation?.setting.location}, {foundation?.setting.timePeriod}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Crime:</span>
                <span className="text-slate-300 capitalize">{foundation?.crimeType}</span>
              </div>
              {solution && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Motive:</span>
                  <span className="text-slate-300">{solution.motive}</span>
                </div>
              )}
            </div>
          </ReferencePanel>

          {/* Character Reference */}
          <ReferencePanel title="Character Reference">
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {generatedCharacters.map((char) => (
                <CharacterRefCard
                  key={char.id}
                  character={char}
                />
              ))}
            </div>
          </ReferencePanel>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-8 border-t border-slate-800">
        <button
          onClick={() => dispatch({ type: 'GO_TO_STAGE', stage: 'characters' })}
          className="px-6 py-3 text-slate-400 hover:text-white transition-colors"
        >
          Back to Characters
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
              {/* Polished Preview Step */}
              {modalStep === 'preview' && foundation && (
                <div className="relative">
                  {/* Hero Banner */}
                  <div className="relative h-48 overflow-hidden">
                    {/* Background: Scene image if available, otherwise elegant gradient */}
                    {sceneImageUrl ? (
                      <>
                        <div className="absolute inset-0">
                          <Image
                            src={sceneImageUrl}
                            alt="Scene"
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/50" />
                      </>
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" />
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent" />
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-red-900/20 via-transparent to-transparent" />
                        {/* Subtle pattern overlay */}
                        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
                      </>
                    )}

                    {/* Gradient fade at bottom */}
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-900 to-transparent" />

                    {/* Title & Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 rounded-md text-xs font-semibold uppercase tracking-wide border border-amber-500/30">
                          {foundation.crimeType}
                        </span>
                        <span className="px-2.5 py-1 bg-slate-700/60 text-slate-300 rounded-md text-xs border border-slate-600/50">
                          {foundation.setting.timePeriod}
                        </span>
                      </div>
                      <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                        {foundation.title}
                      </h2>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="p-6 space-y-5">
                    {/* Synopsis */}
                    <p className="text-slate-300 text-sm leading-relaxed">
                      {foundation.synopsis}
                    </p>

                    {/* Setting Details */}
                    <div className="flex items-center gap-6 text-sm text-slate-400 py-3 border-y border-slate-800">
                      <span className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs">*</span>
                        <span>{foundation.setting.location}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs">~</span>
                        <span className="line-clamp-1">{foundation.setting.atmosphere}</span>
                      </span>
                    </div>

                    {/* Victim Card */}
                    {victim && (
                      <div className="bg-gradient-to-r from-red-950/40 to-slate-800/40 rounded-xl p-4 border border-red-900/20">
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-lg bg-slate-800 overflow-hidden relative shrink-0 border border-red-500/30">
                            {victim.imageUrl ? (
                              <Image src={victim.imageUrl} alt={victim.name} fill className="object-cover grayscale opacity-80" />
                            ) : (
                              <span className="absolute inset-0 flex items-center justify-center text-xl">X</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-red-400 uppercase tracking-widest font-semibold mb-0.5">The Victim</p>
                            <p className="text-white font-semibold">{victim.name}</p>
                            <p className="text-sm text-slate-400 mt-1 line-clamp-2">{foundation.victimParagraph}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Suspects Grid */}
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">Suspects</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {generatedCharacters.filter(c => !c.isVictim).map((char) => (
                          <div
                            key={char.id}
                            className={`
                              group relative rounded-lg overflow-hidden border transition-all
                              ${char.isGuilty
                                ? 'border-red-500/40 ring-1 ring-red-500/20'
                                : 'border-slate-700/60'
                              }
                            `}
                          >
                            <div className="aspect-[3/4] relative">
                              {char.imageUrl ? (
                                <Image src={char.imageUrl} alt={char.name} fill className="object-cover" />
                              ) : (
                                <div className="w-full h-full bg-slate-800 flex items-center justify-center text-4xl">?</div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                              <div className="absolute bottom-0 left-0 right-0 p-3">
                                <p className="text-white font-medium text-sm leading-tight">{char.name}</p>
                                <p className="text-slate-400 text-xs">{char.role}</p>
                              </div>
                              {char.isGuilty && (
                                <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-500 rounded text-[10px] text-white font-semibold uppercase tracking-wide">
                                  Culprit
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Solution Reveal */}
                    {solution && culprit && (
                      <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-3">The Truth</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500 text-xs mb-1">Method</p>
                            <p className="text-slate-300 line-clamp-2">{solution.method}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs mb-1">Motive</p>
                            <p className="text-slate-300 line-clamp-2">{solution.motive}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs mb-1">Evidence Trail</p>
                            <p className="text-slate-300">{clues.length} clues &middot; {totalPoints} pts</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Stats Bar */}
                    <div className="flex items-center justify-center gap-8 py-4 mt-2 border-t border-slate-800/50">
                      <div className="text-center">
                        <p className="text-xl font-bold text-white">{generatedCharacters.filter(c => !c.isVictim).length}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">Suspects</p>
                      </div>
                      <div className="w-px h-8 bg-slate-700/50" />
                      <div className="text-center">
                        <p className="text-xl font-bold text-white">{clues.length}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">Clues</p>
                      </div>
                      <div className="w-px h-8 bg-slate-700/50" />
                      <div className="text-center">
                        <p className="text-xl font-bold text-white">{totalPoints}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">Points</p>
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
                        <span className="text-4xl text-emerald-400">&#10003;</span>
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

/**
 * Reference Panel component for the right sidebar
 */
function ReferencePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
      <h4 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wide">{title}</h4>
      <div>{children}</div>
    </div>
  );
}

/**
 * Compact character reference card for the sidebar
 */
function CharacterRefCard({ character }: { character: UGCGeneratedCharacter }) {
  const secret = character.secrets.length > 0 ? character.secrets[0].content : null;

  return (
    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-600">
      <div className="flex items-center gap-3">
        {/* Small avatar */}
        <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden relative shrink-0">
          {character.imageUrl ? (
            <Image src={character.imageUrl} alt={character.name} fill className="object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">?</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white text-sm truncate">{character.name}</span>
            {character.isGuilty && (
              <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] rounded font-medium">
                Culprit
              </span>
            )}
            {character.isVictim && (
              <span className="px-1.5 py-0.5 bg-slate-500/20 text-slate-400 text-[10px] rounded font-medium">
                Victim
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs">{character.role}</p>
        </div>
      </div>

      {/* Secret preview (if exists and not victim) */}
      {secret && !character.isVictim && (
        <p className="text-slate-400 text-xs mt-2 italic line-clamp-2">
          Secret: {secret}
        </p>
      )}
    </div>
  );
}

/**
 * Clue editing card
 */
interface ClueCardProps {
  clue: UGCGeneratedClue;
  characters: UGCGeneratedCharacter[];
  onUpdate: (updates: Partial<UGCGeneratedClue>) => void;
  onDelete: () => void;
}

function ClueCard({ clue, characters, onUpdate, onDelete }: ClueCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter to only show interactable characters (not victims)
  const interactableCharacters = characters.filter(c => !c.isVictim);

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
              {interactableCharacters.map((char) => (
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
