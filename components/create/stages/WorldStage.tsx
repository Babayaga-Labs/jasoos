'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useWizard } from '../wizard/WizardContext';
import { CharacterPortraitCard } from '../cards/CharacterPortraitCard';
import { FadeInCard, SkeletonCard } from '../cards/FadeInCard';
import type { UGCFormInput, UGCDraftState } from '@/packages/ai/types/ugc-types';

export function WorldStage() {
  const router = useRouter();
  const { state, dispatch, completedCharacters } = useWizard();
  const {
    storyId,
    storyInput,
    generatedStory,
    characters,
    crimeInput,
    generatedPlotPoints,
    minimumPointsToAccuse,
    perfectScoreThreshold,
    sceneImageUrl,
    sceneGenerating,
    worldComplete,
    isSaving,
    error,
  } = state;

  const [saveProgress, setSaveProgress] = useState(0);
  const [saveMessage, setSaveMessage] = useState('');

  // Auto-generate scene image on mount if not already done
  useEffect(() => {
    if (!sceneImageUrl && !sceneGenerating && !worldComplete && generatedStory) {
      generateScene();
    }
  }, []);

  const generateScene = async () => {
    dispatch({ type: 'START_SCENE_GENERATION' });

    try {
      const response = await fetch('/api/ugc/generate-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story: generatedStory }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate scene');
      }

      dispatch({
        type: 'COMPLETE_SCENE_GENERATION',
        imageUrl: data.imageUrl || '/placeholder-scene.png',
      });
    } catch (error) {
      console.warn('Scene generation failed:', error);
      // Mark as complete even if scene fails - it's not critical
      dispatch({
        type: 'COMPLETE_SCENE_GENERATION',
        imageUrl: '/placeholder-scene.png',
      });
    }
  };

  const handleSaveAndLaunch = async () => {
    dispatch({ type: 'START_SAVING' });
    setSaveProgress(0);
    setSaveMessage('Preparing to save...');

    try {
      // Convert wizard state to the format expected by save API
      const formInput: UGCFormInput = {
        title: storyInput.title,
        settingLocation: storyInput.settingLocation,
        timePeriod: storyInput.timePeriod as UGCFormInput['timePeriod'],
        customTimePeriod: storyInput.customTimePeriod,
        premise: storyInput.premise,
        characters: characters.map(c => c.input),
        crime: crimeInput,
      };

      const draft: UGCDraftState = {
        story: generatedStory!,
        characters: completedCharacters,
        plotPoints: {
          plotPoints: generatedPlotPoints!,
          minimumPointsToAccuse,
          perfectScoreThreshold,
        },
        editedSections: new Set(),
        regeneratingSections: new Set(),
      };

      // Use SSE for progress updates
      const response = await fetch('/api/ugc/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          formInput,
          draft: {
            ...draft,
            editedSections: [],
            regeneratingSections: [],
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Save failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response stream');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));

              if (event.type === 'progress') {
                setSaveProgress(event.progress);
                setSaveMessage(event.message);
              } else if (event.type === 'complete') {
                dispatch({ type: 'COMPLETE_SAVING' });
                // Redirect to the game
                router.push(`/game/${event.storyId}`);
                return;
              } else if (event.type === 'error') {
                throw new Error(event.message);
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        error: error instanceof Error ? error.message : 'Save failed',
      });
      dispatch({ type: 'COMPLETE_SAVING' });
    }
  };

  const handleBack = () => {
    dispatch({ type: 'GO_TO_STAGE', stage: 'clues' });
  };

  // Find the culprit
  const culprit = completedCharacters.find(c => c.isGuilty);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-3">
          Your Mystery World
        </h2>
        <p className="text-slate-400">
          Review your creation before launching
        </p>
      </div>

      <div className="space-y-8">
        {/* Scene Image */}
        <FadeInCard delay={0}>
          <div className="relative rounded-2xl overflow-hidden bg-slate-800/50 border border-slate-700/40">
            {sceneGenerating ? (
              <div className="aspect-video flex items-center justify-center bg-slate-800/50">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-slate-400">Generating scene...</p>
                </div>
              </div>
            ) : sceneImageUrl ? (
              <div className="relative aspect-video">
                <Image
                  src={sceneImageUrl}
                  alt="Scene"
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-2xl font-bold text-white mb-2">{generatedStory?.title}</h3>
                  <p className="text-slate-300">{generatedStory?.premise}</p>
                </div>
              </div>
            ) : (
              <div className="aspect-video flex items-center justify-center bg-slate-800/30">
                <p className="text-slate-500">Scene image unavailable</p>
              </div>
            )}
          </div>
        </FadeInCard>

        {/* Story Summary */}
        <FadeInCard delay={150}>
          <div className="rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">📖</span>
              <h3 className="font-semibold text-white">Story Summary</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="p-3 rounded-lg bg-slate-700/30">
                <p className="text-xs text-slate-500 mb-1">Setting</p>
                <p className="text-white">{generatedStory?.setting.location}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-700/30">
                <p className="text-xs text-slate-500 mb-1">Time Period</p>
                <p className="text-white">{generatedStory?.setting.timePeriod}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-700/30">
                <p className="text-xs text-slate-500 mb-1">Difficulty</p>
                <p className="text-white capitalize">{generatedStory?.difficulty}</p>
              </div>
            </div>
            <p className="text-slate-300 italic">{generatedStory?.setting.atmosphere}</p>
          </div>
        </FadeInCard>

        {/* The Solution (Spoiler) */}
        {culprit && (
          <FadeInCard delay={300}>
            <div className="rounded-2xl bg-gradient-to-br from-red-900/30 to-slate-900/60 border border-red-500/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🔍</span>
                <h3 className="font-semibold text-white">The Solution</h3>
                <span className="px-2 py-0.5 text-xs rounded bg-red-500/30 text-red-300">SPOILER</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-700/50 overflow-hidden flex-shrink-0">
                    {culprit.imageUrl ? (
                      <img src={culprit.imageUrl} alt={culprit.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
                    )}
                  </div>
                  <div>
                    <p className="text-red-300 font-bold">{culprit.name}</p>
                    <p className="text-slate-400 text-sm">{culprit.role}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 mb-1">Motive</p>
                    <p className="text-slate-300">{generatedStory?.solution.motive}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 mb-1">Method</p>
                    <p className="text-slate-300">{generatedStory?.solution.method}</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeInCard>
        )}

        {/* Characters Grid */}
        <FadeInCard delay={450}>
          <div className="rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🎭</span>
              <h3 className="font-semibold text-white">Cast of Characters ({completedCharacters.length})</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {completedCharacters.map((char) => (
                <div
                  key={char.id}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    char.isGuilty ? 'bg-red-500/10 border border-red-500/20' :
                    char.isVictim ? 'bg-slate-700/20 border border-slate-600/20' :
                    'bg-slate-700/20'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-600/50 overflow-hidden flex-shrink-0">
                    {char.imageUrl ? (
                      <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {char.isVictim ? '💀' : '👤'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{char.name}</p>
                    <p className="text-xs text-slate-400 truncate">{char.role}</p>
                  </div>
                  {char.isGuilty && (
                    <span className="px-2 py-0.5 text-xs rounded bg-red-500/30 text-red-300">GUILTY</span>
                  )}
                  {char.isVictim && (
                    <span className="px-2 py-0.5 text-xs rounded bg-slate-600/50 text-slate-400">VICTIM</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </FadeInCard>

        {/* Stats */}
        <FadeInCard delay={600}>
          <div className="flex items-center justify-center gap-6 py-4">
            <div className="text-center px-4 py-2 rounded-lg bg-slate-800/30">
              <p className="text-2xl font-bold text-emerald-400">{generatedPlotPoints?.length || 0}</p>
              <p className="text-xs text-slate-500">Clues</p>
            </div>
            <div className="text-center px-4 py-2 rounded-lg bg-slate-800/30">
              <p className="text-2xl font-bold text-amber-400">{minimumPointsToAccuse}</p>
              <p className="text-xs text-slate-500">Min to Accuse</p>
            </div>
            <div className="text-center px-4 py-2 rounded-lg bg-slate-800/30">
              <p className="text-2xl font-bold text-violet-400">{generatedStory?.estimatedMinutes || 0}</p>
              <p className="text-xs text-slate-500">Est. Minutes</p>
            </div>
          </div>
        </FadeInCard>

        {/* Save Progress */}
        {isSaving && (
          <FadeInCard delay={0}>
            <div className="rounded-2xl bg-gradient-to-br from-violet-900/30 to-slate-900/60 border border-violet-500/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-violet-300 font-medium">{saveMessage}</span>
              </div>
              <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-violet-500 to-pink-500 transition-all duration-300"
                  style={{ width: `${saveProgress}%` }}
                />
              </div>
            </div>
          </FadeInCard>
        )}

        {/* Actions */}
        <div
          className="flex items-center gap-4 pt-4 opacity-0 animate-fade-in-up"
          style={{ animationDelay: '750ms', animationFillMode: 'forwards' }}
        >
          <button
            onClick={handleBack}
            disabled={isSaving}
            className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all disabled:opacity-50"
          >
            ← Back to Clues
          </button>

          <button
            onClick={handleSaveAndLaunch}
            disabled={isSaving || sceneGenerating}
            className={`
              flex-1 py-4 px-6 rounded-xl font-semibold text-lg transition-all transform
              ${!isSaving && !sceneGenerating
                ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98]'
                : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            {isSaving ? 'Saving...' : sceneGenerating ? 'Generating Scene...' : '🚀 Save & Launch Mystery'}
          </button>
        </div>
      </div>
    </div>
  );
}
