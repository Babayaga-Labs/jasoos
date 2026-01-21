'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useWizard } from '../wizard/WizardContext';
import type { UGCGeneratedCharacter } from '@/packages/ai/types/ugc-types';
import { PERSONALITY_TRAITS } from '@/packages/ai/types/ugc-types';

const MAX_TRAITS = 5;

export function CharactersStage() {
  const { state, dispatch, canProceedFromCharacters } = useWizard();
  const {
    generatedCharacters,
    foundation,
  } = state;

  if (generatedCharacters.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">No characters generated yet. Complete the foundation first.</p>
        <button
          onClick={() => dispatch({ type: 'GO_TO_STAGE', stage: 'foundation' })}
          className="mt-4 px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
        >
          Go to Foundation
        </button>
      </div>
    );
  }

  const handleRegenerateImage = async (character: UGCGeneratedCharacter) => {
    dispatch({ type: 'START_IMAGE_REGEN', characterId: character.id });

    try {
      const response = await fetch('/api/ugc/regenerate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: character.id,
          appearanceDescription: character.appearance.description,
          setting: foundation?.setting,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to regenerate image');
      }

      const result = await response.json();
      dispatch({
        type: 'COMPLETE_IMAGE_REGEN',
        characterId: character.id,
        imageUrl: result.imageUrl,
      });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        error: error instanceof Error ? error.message : 'Failed to regenerate image',
      });
    }
  };

  const handleBack = () => {
    if (state.hasGeneratedOnce) {
      const confirmed = window.confirm(
        'Going back to the foundation will require regenerating characters if you make changes. Your current characters will be preserved until you regenerate.'
      );
      if (!confirmed) return;
    }
    dispatch({ type: 'GO_TO_STAGE', stage: 'foundation' });
  };

  const handleContinueToClues = async () => {
    if (!foundation || !state.solution) return;

    // Start clue generation
    dispatch({ type: 'START_CLUES_GEN' });

    // Start scene image generation in background (don't block clue generation)
    if (foundation?.setting && !state.sceneImageUrl) {
      dispatch({ type: 'START_SCENE_GEN' });
      fetch('/api/ugc/generate-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          story: { setting: foundation.setting },
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.imageUrl) {
            dispatch({ type: 'COMPLETE_SCENE_GEN', imageUrl: data.imageUrl });
          }
        })
        .catch((err) => {
          console.warn('Scene generation failed:', err);
        });
    }

    try {
      // Generate clues based on finalized characters
      const response = await fetch('/api/ugc/generate-clues-staged', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          foundation,
          characters: generatedCharacters,
          solution: state.solution,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate clues');
      }

      const data = await response.json();

      // Complete clue generation - this navigates to clues stage
      dispatch({
        type: 'COMPLETE_CLUES_GEN',
        clues: data.clues,
        scoring: data.scoring,
      });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        error: error instanceof Error ? error.message : 'Failed to generate clues',
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-3">
          Your Characters
        </h2>
        <p className="text-slate-400">
          Review and customize your characters. Edit their appearance, personality, and secrets.
        </p>
      </div>

      {/* Character Cards - Vertical Stack */}
      <div className="space-y-6">
        {generatedCharacters.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            onUpdate={(updates) => dispatch({ type: 'UPDATE_GENERATED_CHARACTER', id: character.id, updates })}
            onRegenerateImage={() => handleRegenerateImage(character)}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-8">
        <button
          onClick={handleBack}
          className="px-6 py-3 text-slate-400 hover:text-white transition-colors"
        >
          ← Back to Foundation
        </button>

        <button
          onClick={handleContinueToClues}
          disabled={!canProceedFromCharacters || state.cluesGenerating}
          className={`
            py-4 px-8 rounded-xl font-semibold text-lg transition-all duration-300
            ${canProceedFromCharacters && !state.cluesGenerating
              ? 'bg-gradient-to-r from-amber-500 via-violet-500 to-pink-500 text-white shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 hover:scale-[1.02]'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }
          `}
        >
          {state.cluesGenerating ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating Clues...
            </span>
          ) : (
            'Continue to Clues'
          )}
        </button>
      </div>
    </div>
  );
}

interface CharacterCardProps {
  character: UGCGeneratedCharacter;
  onUpdate: (updates: Partial<UGCGeneratedCharacter>) => void;
  onRegenerateImage: () => void;
}

function CharacterCard({
  character,
  onUpdate,
  onRegenerateImage,
}: CharacterCardProps) {
  const isImageGenerating = 'imageGenerating' in character && Boolean((character as Record<string, unknown>).imageGenerating);
  // Normalize traits to lowercase for consistent comparison
  // Only count traits that exist in PERSONALITY_TRAITS (LLM may have generated non-standard ones)
  const normalizedStoredTraits = character.personality.traits.map(t => t.toLowerCase());
  const selectedTraits = normalizedStoredTraits.filter(t =>
    (PERSONALITY_TRAITS as readonly string[]).includes(t)
  );

  const handleToggleTrait = (trait: string) => {
    const normalizedTrait = trait.toLowerCase();
    const isSelected = selectedTraits.includes(normalizedTrait);
    let newTraits: string[];

    if (isSelected) {
      // Remove trait (filter by lowercase comparison)
      newTraits = selectedTraits.filter(t => t !== normalizedTrait);
    } else {
      // Add trait (if under limit)
      if (selectedTraits.length >= MAX_TRAITS) return;
      newTraits = [...selectedTraits, normalizedTrait];
    }

    onUpdate({
      personality: { ...character.personality, traits: newTraits },
    });
  };

  return (
    <div
      className={`
        bg-slate-800/50 rounded-xl border transition-all duration-300 overflow-hidden
        ${character.isGuilty ? 'border-red-500/50' : 'border-slate-700'}
      `}
    >
      {/* Header Section */}
      <div className="p-4 flex items-start gap-4">
        {/* Small Image */}
        <div className="relative w-20 h-20 rounded-lg bg-slate-900 overflow-hidden shrink-0">
          {character.imageUrl ? (
            <Image
              src={character.imageUrl}
              alt={character.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-3xl text-slate-600">
              👤
            </div>
          )}
        </div>

        {/* Name & Role Inputs */}
        <div className="flex-1 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Name</label>
            <input
              type="text"
              value={character.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Role</label>
            <input
              type="text"
              value={character.role}
              onChange={(e) => onUpdate({ role: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-col gap-2 shrink-0">
          {character.isGuilty && (
            <span className="px-3 py-1 bg-red-500 text-white text-xs font-medium rounded-full">
              Culprit
            </span>
          )}
          {character.isVictim && (
            <span className="px-3 py-1 bg-slate-500 text-white text-xs font-medium rounded-full">
              Victim
            </span>
          )}
        </div>
      </div>

      {/* Body Section */}
      <div className="px-4 pb-4 space-y-4">
        {/* Appearance with Regenerate Button */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-slate-400">Appearance</label>
            <button
              onClick={onRegenerateImage}
              disabled={isImageGenerating}
              className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImageGenerating ? (
                <>
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 2v6h-6" />
                    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                    <path d="M3 22v-6h6" />
                    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                  </svg>
                  <span>Regenerate Image</span>
                </>
              )}
            </button>
          </div>
          <textarea
            value={character.appearance.description}
            onChange={(e) =>
              onUpdate({
                appearance: { ...character.appearance, description: e.target.value },
              })
            }
            rows={2}
            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          />
        </div>

        {/* Personality Tags */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-slate-400">
              Personality Traits
              <span className="text-red-400 ml-1">*</span>
            </label>
            <span className={`text-xs ${selectedTraits.length === 0 ? 'text-red-400' : 'text-slate-500'}`}>
              {selectedTraits.length === 0 ? 'Select at least 1' : `${selectedTraits.length}/${MAX_TRAITS} selected`}
            </span>
          </div>
          <div className={`flex flex-wrap gap-1.5 p-2 rounded-lg ${selectedTraits.length === 0 ? 'bg-red-500/5 border border-red-500/30' : ''}`}>
            {PERSONALITY_TRAITS.map((trait) => {
              const isSelected = selectedTraits.includes(trait);
              const isDisabled = !isSelected && selectedTraits.length >= MAX_TRAITS;

              return (
                <button
                  key={trait}
                  onClick={() => handleToggleTrait(trait)}
                  disabled={isDisabled}
                  className={`
                    px-2.5 py-1 rounded-full text-xs font-medium transition-all
                    ${isSelected
                      ? 'bg-violet-500/20 text-violet-400 border border-violet-500'
                      : isDisabled
                        ? 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed'
                        : 'bg-slate-700/50 text-slate-400 border border-slate-600 hover:border-slate-500 hover:text-white'
                    }
                  `}
                >
                  {trait}
                </button>
              );
            })}
          </div>
        </div>

        {/* Secret (if exists) */}
        {character.secrets.length > 0 && (
          <div>
            <label className="block text-xs text-slate-400 mb-1">Secret</label>
            <textarea
              value={character.secrets[0]?.content || ''}
              onChange={(e) =>
                onUpdate({
                  secrets: [
                    { ...character.secrets[0], content: e.target.value },
                    ...character.secrets.slice(1),
                  ],
                })
              }
              rows={2}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>
        )}

      </div>
    </div>
  );
}
