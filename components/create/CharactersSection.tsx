'use client';

import { MIN_CHARACTERS, MAX_CHARACTERS } from '@/packages/ai/types/ugc-types';
import type { UGCCharacterInput } from '@/packages/ai/types/ugc-types';
import { CharacterCard } from './CharacterCard';

interface CharactersSectionProps {
  characters: UGCCharacterInput[];
  onCharactersChange: (characters: UGCCharacterInput[]) => void;
  disabled?: boolean;
}

function generateTempId(): string {
  return `char-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
}

function createEmptyCharacter(): UGCCharacterInput {
  return {
    tempId: generateTempId(),
    name: '',
    role: '',
    description: '',
    uploadedImageUrl: null,
    isVictim: false,
    personalityTraits: [],
    secret: '',
  };
}

export function CharactersSection({
  characters,
  onCharactersChange,
  disabled = false,
}: CharactersSectionProps) {
  const handleAddCharacter = () => {
    if (characters.length < MAX_CHARACTERS) {
      onCharactersChange([...characters, createEmptyCharacter()]);
    }
  };

  const handleUpdateCharacter = (index: number, updated: UGCCharacterInput) => {
    const newCharacters = [...characters];
    newCharacters[index] = updated;
    onCharactersChange(newCharacters);
  };

  const handleDeleteCharacter = (index: number) => {
    if (characters.length > MIN_CHARACTERS) {
      const newCharacters = characters.filter((_, i) => i !== index);
      onCharactersChange(newCharacters);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-700 pb-2">
        <h2 className="text-xl font-semibold text-white">
          Characters
          <span className="text-sm font-normal text-slate-400 ml-2">
            ({characters.length}/{MAX_CHARACTERS})
          </span>
        </h2>
        <button
          type="button"
          onClick={handleAddCharacter}
          disabled={disabled || characters.length >= MAX_CHARACTERS}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Character
        </button>
      </div>

      <p className="text-sm text-slate-400">
        Add {MIN_CHARACTERS}-{MAX_CHARACTERS} characters for your mystery. One will be the culprit, and optionally one can be the victim.
      </p>

      <div className="space-y-4">
        {characters.map((character, index) => (
          <CharacterCard
            key={character.tempId}
            character={character}
            index={index}
            canDelete={characters.length > MIN_CHARACTERS}
            onUpdate={(updated) => handleUpdateCharacter(index, updated)}
            onDelete={() => handleDeleteCharacter(index)}
            disabled={disabled}
          />
        ))}
      </div>

      {characters.length < MIN_CHARACTERS && (
        <p className="text-sm text-amber-400">
          Add at least {MIN_CHARACTERS - characters.length} more character(s) to continue.
        </p>
      )}
    </div>
  );
}

// Export the helper function for initializing characters
export { createEmptyCharacter };
