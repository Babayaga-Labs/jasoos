'use client';

import { useState } from 'react';
import { PERSONALITY_TRAITS } from '@/packages/ai/types/ugc-types';
import type { UGCCharacterInput } from '@/packages/ai/types/ugc-types';

interface CharacterCardProps {
  character: UGCCharacterInput;
  index: number;
  canDelete: boolean;
  onUpdate: (updated: UGCCharacterInput) => void;
  onDelete: () => void;
  disabled?: boolean;
}

export function CharacterCard({
  character,
  index,
  canDelete,
  onUpdate,
  onDelete,
  disabled = false,
}: CharacterCardProps) {
  const [showTraits, setShowTraits] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const handleTraitToggle = (trait: string) => {
    const currentTraits = character.personalityTraits || [];
    const newTraits = currentTraits.includes(trait)
      ? currentTraits.filter(t => t !== trait)
      : [...currentTraits, trait].slice(0, 5); // Max 5 traits
    onUpdate({ ...character, personalityTraits: newTraits });
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-amber-400">
          Character {index + 1}
          {character.isVictim && <span className="ml-2 text-red-400">(Victim)</span>}
        </h3>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled}
            className="text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
            title="Remove character"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={character.name}
            onChange={(e) => onUpdate({ ...character, name: e.target.value })}
            placeholder="e.g., Sarah Chen"
            disabled={disabled}
            className="w-full px-2 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Role <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={character.role}
            onChange={(e) => onUpdate({ ...character, role: e.target.value })}
            placeholder="e.g., Hotel Manager"
            disabled={disabled}
            className="w-full px-2 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs text-slate-400 mb-1">
          Description <span className="text-red-400">*</span>
        </label>
        <textarea
          value={character.description}
          onChange={(e) => onUpdate({ ...character, description: e.target.value })}
          placeholder="Brief description of appearance and demeanor (used for image generation)"
          disabled={disabled}
          rows={2}
          className="w-full px-2 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none disabled:opacity-50"
        />
      </div>

      {/* Is Victim Checkbox */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`isVictim-${character.tempId}`}
          checked={character.isVictim || false}
          onChange={(e) => onUpdate({ ...character, isVictim: e.target.checked })}
          disabled={disabled}
          className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-amber-500 focus:ring-amber-500"
        />
        <label htmlFor={`isVictim-${character.tempId}`} className="text-xs text-slate-400">
          This character is the victim
        </label>
      </div>

      {/* Optional: Personality Traits */}
      <div>
        <button
          type="button"
          onClick={() => setShowTraits(!showTraits)}
          disabled={disabled}
          className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1 disabled:opacity-50"
        >
          <svg
            className={`w-3 h-3 transition-transform ${showTraits ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Personality Traits (optional)
          {character.personalityTraits && character.personalityTraits.length > 0 && (
            <span className="text-amber-400">({character.personalityTraits.length})</span>
          )}
        </button>

        {showTraits && (
          <div className="mt-2 flex flex-wrap gap-1">
            {PERSONALITY_TRAITS.map((trait) => {
              const isSelected = character.personalityTraits?.includes(trait);
              return (
                <button
                  key={trait}
                  type="button"
                  onClick={() => handleTraitToggle(trait)}
                  disabled={disabled || (!isSelected && (character.personalityTraits?.length || 0) >= 5)}
                  className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                    isSelected
                      ? 'bg-amber-500/30 text-amber-400 border border-amber-500/50'
                      : 'bg-slate-700/50 text-slate-400 border border-slate-600 hover:border-amber-500/50'
                  } disabled:opacity-50`}
                >
                  {trait}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Optional: Secret */}
      <div>
        <button
          type="button"
          onClick={() => setShowSecret(!showSecret)}
          disabled={disabled}
          className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1 disabled:opacity-50"
        >
          <svg
            className={`w-3 h-3 transition-transform ${showSecret ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Dark Secret (optional)
          {character.secret && <span className="text-amber-400">(set)</span>}
        </button>

        {showSecret && (
          <textarea
            value={character.secret || ''}
            onChange={(e) => onUpdate({ ...character, secret: e.target.value })}
            placeholder="A secret this character is hiding..."
            disabled={disabled}
            rows={2}
            className="mt-2 w-full px-2 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none disabled:opacity-50"
          />
        )}
      </div>
    </div>
  );
}
