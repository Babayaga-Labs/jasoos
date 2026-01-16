'use client';

import { useState } from 'react';
import {
  useWizard,
  createEmptyCharacterInput,
  type ScaffoldCharacterItem,
} from '../wizard/WizardContext';
import { CharacterPortraitCard, CharacterSkeleton } from '../cards/CharacterPortraitCard';
import { PERSONALITY_TRAITS, MIN_CHARACTERS, MAX_CHARACTERS } from '@/packages/ai/types/ugc-types';
import type { UGCCharacterInput } from '@/packages/ai/types/ugc-types';

export function CharactersStage() {
  const {
    state,
    dispatch,
    canProceedFromCharacters,
    canProceedFromScaffoldCharacters,
    completedCharacters,
    completedScaffoldCharacters,
    selectedCulprit,
  } = useWizard();

  const {
    useScaffoldFlow,
    // Legacy flow state
    generatedStory,
    characters,
    currentCharacterInput,
    // Scaffold flow state
    scaffold,
    scaffoldCharacters,
  } = state;

  // ============================================================================
  // SCAFFOLD FLOW
  // ============================================================================

  if (useScaffoldFlow && scaffold) {
    return (
      <ScaffoldCharactersStage
        scaffoldCharacters={scaffoldCharacters}
        dispatch={dispatch}
        canProceed={canProceedFromScaffoldCharacters}
        completedCount={completedScaffoldCharacters.length}
        selectedCulprit={selectedCulprit}
      />
    );
  }

  // ============================================================================
  // LEGACY FLOW
  // ============================================================================

  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [formData, setFormData] = useState<UGCCharacterInput>(
    currentCharacterInput || createEmptyCharacterInput()
  );

  const completedCount = characters.filter(c => c.isComplete).length;
  const generatingCount = characters.filter(c => c.isGenerating).length;
  const totalInProgress = completedCount + generatingCount;
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
            <span className="text-emerald-400 text-sm">Ready</span>
          )}
        </div>
      </div>

      {/* Character list */}
      {characters.length > 0 && (
        <div className="mb-8 space-y-4">
          {characters.map((charItem) => (
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

      {/* Add character form */}
      {canAddMore && (
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">+</span>
              <h3 className="text-lg font-semibold text-white">
                {totalInProgress === 0 ? 'Add Your First Character' : 'Add Another Character'}
              </h3>
            </div>
          </div>

          <div className="space-y-5">
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

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Appearance Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Elegant woman in her 50s with silver hair..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all resize-none"
              />
            </div>

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
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Personality Traits <span className="text-slate-500">(Optional, up to 5)</span>
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

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Dark Secret <span className="text-slate-500">(Optional)</span>
              </label>
              <input
                type="text"
                value={formData.secret || ''}
                onChange={(e) => handleInputChange('secret', e.target.value)}
                placeholder="Has been secretly selling the family heirlooms..."
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
              />
            </div>

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
          Back
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
          {canProceedFromCharacters ? 'Continue' : `Add ${MIN_CHARACTERS - completedCount} More`}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SCAFFOLD CHARACTERS STAGE COMPONENT
// ============================================================================

interface ScaffoldCharactersStageProps {
  scaffoldCharacters: ScaffoldCharacterItem[];
  dispatch: React.Dispatch<any>;
  canProceed: boolean;
  completedCount: number;
  selectedCulprit: ScaffoldCharacterItem | null;
}

function ScaffoldCharactersStage({
  scaffoldCharacters,
  dispatch,
  canProceed,
  completedCount,
  selectedCulprit,
}: ScaffoldCharactersStageProps) {
  const [expandedChar, setExpandedChar] = useState<string | null>(
    scaffoldCharacters[0]?.suggestionId || null
  );

  const handleUpdateCharacter = (suggestionId: string, updates: Partial<ScaffoldCharacterItem>) => {
    dispatch({ type: 'UPDATE_SCAFFOLD_CHARACTER', suggestionId, updates });
  };

  const handleSetCulprit = (suggestionId: string) => {
    dispatch({ type: 'SET_CULPRIT', suggestionId });
  };

  const handleProceed = () => {
    dispatch({ type: 'GO_TO_STAGE', stage: 'clues' });
  };

  const handleBack = () => {
    dispatch({ type: 'GO_TO_STAGE', stage: 'story' });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-3">
          Flesh Out Your Characters
        </h2>
        <p className="text-slate-400">
          Give each character a personality, appearance, and most importantly - a secret
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50">
          <span className="text-slate-400">Completed:</span>
          <span className={`font-bold ${completedCount >= 3 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {completedCount} / {scaffoldCharacters.length}
          </span>
          {completedCount >= 3 && (
            <span className="text-emerald-400 text-sm">Ready</span>
          )}
        </div>
      </div>

      {/* Character Cards */}
      <div className="space-y-4 mb-8">
        {scaffoldCharacters.map((char, index) => (
          <ScaffoldCharacterCard
            key={char.suggestionId}
            character={char}
            index={index}
            isExpanded={expandedChar === char.suggestionId}
            onToggle={() => setExpandedChar(
              expandedChar === char.suggestionId ? null : char.suggestionId
            )}
            onUpdate={(updates) => handleUpdateCharacter(char.suggestionId, updates)}
            onSetCulprit={() => handleSetCulprit(char.suggestionId)}
            isCulprit={char.isCulprit}
          />
        ))}
      </div>

      {/* Culprit Selection Reminder */}
      {!selectedCulprit && completedCount >= 3 && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-center">
          Don't forget to mark one character as the culprit!
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="px-6 py-3 rounded-xl font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all"
        >
          Back to Story
        </button>

        <button
          onClick={handleProceed}
          disabled={!canProceed || !selectedCulprit}
          className={`
            flex-1 py-4 px-6 rounded-xl font-semibold text-lg transition-all transform
            ${canProceed && selectedCulprit
              ? 'bg-gradient-to-r from-amber-500 via-violet-500 to-pink-500 text-white hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98]'
              : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
            }
          `}
        >
          {!selectedCulprit
            ? 'Select a Culprit'
            : completedCount < 3
            ? `Complete ${3 - completedCount} More Characters`
            : 'Continue to Crime Details'
          }
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SCAFFOLD CHARACTER CARD COMPONENT
// ============================================================================

interface ScaffoldCharacterCardProps {
  character: ScaffoldCharacterItem;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<ScaffoldCharacterItem>) => void;
  onSetCulprit: () => void;
  isCulprit: boolean;
}

function ScaffoldCharacterCard({
  character,
  index,
  isExpanded,
  onToggle,
  onUpdate,
  onSetCulprit,
  isCulprit,
}: ScaffoldCharacterCardProps) {
  const [localTraits, setLocalTraits] = useState<string[]>(character.personalityTraits);

  const toggleTrait = (trait: string) => {
    const newTraits = localTraits.includes(trait)
      ? localTraits.filter(t => t !== trait)
      : localTraits.length < 5 ? [...localTraits, trait] : localTraits;
    setLocalTraits(newTraits);
    onUpdate({ personalityTraits: newTraits });
  };

  const isComplete = character.isComplete;

  return (
    <div
      className={`
        rounded-2xl border transition-all
        ${isCulprit
          ? 'bg-gradient-to-br from-red-900/30 to-slate-900/60 border-red-500/50'
          : isComplete
          ? 'bg-gradient-to-br from-emerald-900/20 to-slate-900/60 border-emerald-500/30'
          : 'bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/40'
        }
      `}
    >
      {/* Header - Always visible */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-4 text-left"
      >
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
          ${isCulprit
            ? 'bg-red-500/30 text-red-300'
            : isComplete
            ? 'bg-emerald-500/30 text-emerald-300'
            : 'bg-slate-700/50 text-slate-400'
          }
        `}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{character.name || character.suggestedName}</span>
            {isCulprit && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/30 text-red-300 border border-red-500/50">
                CULPRIT
              </span>
            )}
            {isComplete && !isCulprit && (
              <span className="text-emerald-400 text-sm">Complete</span>
            )}
          </div>
          <p className="text-slate-400 text-sm">{character.role || character.suggestedRole}</p>
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Connection hint from scaffold */}
          <div className="p-3 rounded-lg bg-slate-800/40 text-sm">
            <span className="text-slate-500">Story connection: </span>
            <span className="text-slate-300">{character.connectionToCrime}</span>
          </div>

          {/* Name & Role */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
              <input
                type="text"
                value={character.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
              <input
                type="text"
                value={character.role}
                onChange={(e) => onUpdate({ role: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Appearance */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Appearance <span className="text-red-400">*</span>
            </label>
            <textarea
              value={character.appearance}
              onChange={(e) => onUpdate({ appearance: e.target.value })}
              placeholder="Describe their physical appearance, clothing, distinctive features..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all resize-none"
            />
          </div>

          {/* Personality Traits */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Personality Traits <span className="text-red-400">*</span>
              <span className="text-slate-500 font-normal ml-2">(Pick 1-5)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {PERSONALITY_TRAITS.map((trait) => (
                <button
                  key={trait}
                  type="button"
                  onClick={() => toggleTrait(trait)}
                  className={`
                    px-3 py-1.5 text-sm rounded-full border transition-all
                    ${localTraits.includes(trait)
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

          {/* Secret - THE KEY FIELD */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Their Secret <span className="text-red-400">*</span>
              <span className="text-slate-500 font-normal ml-2">(This drives the mystery!)</span>
            </label>
            <textarea
              value={character.secret}
              onChange={(e) => onUpdate({ secret: e.target.value })}
              placeholder={character.potentialMotive
                ? `Hint: ${character.potentialMotive}. What's the full story behind this?`
                : "What are they hiding? This will shape the timeline and clues..."
              }
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all resize-none"
            />
            <p className="text-xs text-slate-500 mt-1">
              Be specific! This secret will appear in the timeline and become discoverable through interrogation.
            </p>
          </div>

          {/* Culprit Toggle */}
          <div className="pt-2">
            <button
              onClick={onSetCulprit}
              className={`
                w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2
                ${isCulprit
                  ? 'bg-red-500/30 border border-red-500/50 text-red-300'
                  : 'bg-slate-700/30 border border-slate-600/50 text-slate-400 hover:border-red-500/30 hover:text-red-300'
                }
              `}
            >
              {isCulprit ? (
                <>
                  <span>This is the Culprit</span>
                  <span className="text-red-400">x</span>
                </>
              ) : (
                <>
                  <span>Mark as Culprit</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
