'use client';

import { useState } from 'react';
import {
  useWizard,
  createEmptyCharacterInput,
} from '../wizard/WizardContext';
import { CharacterPortraitCard, CharacterSkeleton } from '../cards/CharacterPortraitCard';
import { PERSONALITY_TRAITS, MIN_CHARACTERS, MAX_CHARACTERS } from '@/packages/ai/types/ugc-types';
import type { UGCCharacterInput } from '@/packages/ai/types/ugc-types';

export function CharactersStage() {
  const {
    state,
    dispatch,
    canProceedFromCharacters,
    completedCharacters,
  } = useWizard();

  const { generatedStory, characters, currentCharacterInput } = state;
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);

  // Form state for new character
  const [formData, setFormData] = useState<UGCCharacterInput>(
    currentCharacterInput || createEmptyCharacterInput()
  );

  const completedCount = characters.filter(c => c.isComplete).length;
  const generatingCount = characters.filter(c => c.isGenerating).length;
  const totalInProgress = completedCount + generatingCount;
  // Allow adding more as long as we haven't hit max (including generating ones)
  const canAddMore = totalInProgress < MAX_CHARACTERS;

  const handleInputChange = (field: keyof UGCCharacterInput, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleTrait = (trait: string) => {
    setSelectedTraits(prev => {
      const newTraits = prev.includes(trait)
        ? prev.filter(t => t !== trait)
        : prev.length < 5 ? [...prev, trait] : prev;
      setFormData(f => ({ ...f, personalityTraits: newTraits }));
      return newTraits;
    });
  };

  const handleGenerate = async () => {
    if (!isFormValid) return;

    const input = { ...formData, personalityTraits: selectedTraits };
    dispatch({ type: 'START_CHARACTER_GENERATION', input });

    // Reset form immediately so user can start on next character
    setFormData(createEmptyCharacterInput());
    setSelectedTraits([]);

    try {
      const response = await fetch('/api/ugc/generate-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterInput: input,
          storyContext: generatedStory,
          existingCharacters: completedCharacters,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate character');
      }

      dispatch({
        type: 'COMPLETE_CHARACTER_GENERATION',
        tempId: input.tempId,
        character: data.character,
      });

    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        error: error instanceof Error ? error.message : 'Character generation failed',
      });
    }
  };

  const handleDelete = (tempId: string) => {
    dispatch({ type: 'DELETE_CHARACTER', tempId });
  };

  const handleProceed = () => {
    dispatch({ type: 'GO_TO_STAGE', stage: 'clues' });
  };

  const handleBack = () => {
    dispatch({ type: 'GO_TO_STAGE', stage: 'story' });
  };

  const isFormValid =
    formData.name.trim() &&
    formData.role.trim() &&
    formData.description.trim().length >= 10;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-3">
          Create Your Characters
        </h2>
        <p className="text-slate-400">
          Add {MIN_CHARACTERS}-{MAX_CHARACTERS} characters one at a time. Each will be enhanced with personality and a portrait.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50">
          <span className="text-slate-400">Characters:</span>
          <span className={`font-bold ${completedCount >= MIN_CHARACTERS ? 'text-emerald-400' : 'text-amber-400'}`}>
            {completedCount}{generatingCount > 0 && <span className="text-violet-400"> (+{generatingCount})</span>} / {MAX_CHARACTERS}
          </span>
          {completedCount >= MIN_CHARACTERS && generatingCount === 0 && (
            <span className="text-emerald-400 text-sm">✓ Ready</span>
          )}
          {generatingCount > 0 && (
            <span className="text-violet-400 text-sm animate-pulse">Generating...</span>
          )}
        </div>
      </div>

      {/* Character list */}
      {characters.length > 0 && (
        <div className="mb-8 space-y-4">
          {characters.map((charItem, index) => (
            charItem.isGenerating ? (
              <CharacterSkeleton key={charItem.input.tempId} delay={0} />
            ) : charItem.generated ? (
              <CharacterPortraitCard
                key={charItem.input.tempId}
                character={charItem.generated}
                onDelete={() => handleDelete(charItem.input.tempId)}
                delay={0}
              />
            ) : null
          ))}
        </div>
      )}

      {/* Add character form - always visible while we can add more */}
      {canAddMore && (
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">➕</span>
              <h3 className="text-lg font-semibold text-white">
                {totalInProgress === 0 ? 'Add Your First Character' : 'Add Another Character'}
              </h3>
            </div>
            {generatingCount > 0 && (
              <span className="text-sm text-violet-400 animate-pulse">
                {generatingCount} generating in background...
              </span>
            )}
          </div>

          <div className="space-y-5">
            {/* Name & Role row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Character Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Lady Victoria Sterling"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Role / Occupation
                </label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  placeholder="The Wealthy Widow"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Appearance Description
                <span className="text-slate-500 font-normal ml-2">(Used for portrait)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Elegant woman in her 50s with silver hair pinned up, wearing expensive pearls and a dark velvet dress. Sharp, calculating eyes."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all resize-none"
              />
            </div>

            {/* Is Victim */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isVictim"
                checked={formData.isVictim || false}
                onChange={(e) => handleInputChange('isVictim', e.target.checked)}
                className="w-5 h-5 rounded bg-slate-700 border-slate-600 text-violet-500 focus:ring-violet-500/50"
              />
              <label htmlFor="isVictim" className="text-slate-300">
                This character is a victim
                <span className="text-slate-500 text-sm ml-2">(Cannot be interrogated)</span>
              </label>
            </div>

            {/* Personality Traits */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Personality Traits
                <span className="text-slate-500 font-normal ml-2">(Optional, pick up to 5)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {PERSONALITY_TRAITS.map((trait) => (
                  <button
                    key={trait}
                    type="button"
                    onClick={() => toggleTrait(trait)}
                    className={`
                      px-3 py-1.5 text-sm rounded-full border transition-all
                      ${selectedTraits.includes(trait)
                        ? 'bg-violet-500/30 border-violet-500/50 text-violet-300'
                        : 'bg-slate-700/30 border-slate-600/50 text-slate-400 hover:border-slate-500'
                      }
                    `}
                  >
                    {trait}
                  </button>
                ))}
              </div>
            </div>

            {/* Secret */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Dark Secret
                <span className="text-slate-500 font-normal ml-2">(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.secret || ''}
                onChange={(e) => handleInputChange('secret', e.target.value)}
                placeholder="Has been secretly selling the family heirlooms..."
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
              />
            </div>

            {/* Generate Button - enabled as long as form is valid */}
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
              Generate Character
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
        >
          ← Back to Story
        </button>

        <button
          onClick={handleProceed}
          disabled={!canProceedFromCharacters}
          className={`
            flex-1 py-4 px-6 rounded-xl font-semibold text-lg transition-all transform
            ${canProceedFromCharacters
              ? 'bg-gradient-to-r from-amber-500 via-violet-500 to-pink-500 text-white hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98]'
              : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
            }
          `}
        >
          {canProceedFromCharacters
            ? 'Continue to Clues'
            : `Add ${MIN_CHARACTERS - completedCount} More Character${MIN_CHARACTERS - completedCount > 1 ? 's' : ''}`
          }
        </button>
      </div>
    </div>
  );
}
