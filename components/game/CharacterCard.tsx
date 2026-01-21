'use client';

import Image from 'next/image';
import { Character } from '@/lib/store';

interface CharacterCardProps {
  character: Character;
  storyId: string;
  isSelected: boolean;
  hasMessages: boolean;
  onChat: () => void;
}

export function CharacterCard({ character, storyId, isSelected, hasMessages, onChat }: CharacterCardProps) {
  // Use imageUrl from Supabase, fallback to filesystem path for legacy stories
  const imageUrl = character.imageUrl || `/stories/${storyId}/assets/characters/${character.id}.png`;

  return (
    <div
      className={`
        bg-slate-800/90 rounded-lg border-2 transition-all duration-200
        ${isSelected
          ? 'border-rose-500 shadow-lg shadow-rose-500/20'
          : 'border-slate-600 hover:border-slate-500'
        }
      `}
    >
      <div className="flex gap-4 p-4">
        {/* Portrait */}
        <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-slate-600">
          <Image
            src={imageUrl}
            alt={character.name}
            fill
            className="object-cover"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-bold text-white text-lg">{character.name}</h3>
              <p className="text-sm text-slate-400">{character.role}</p>
            </div>
            {hasMessages && (
              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                Interviewed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Statement */}
      <div className="px-4 pb-3">
        <p className="text-sm text-slate-300 italic leading-relaxed">
          "{character.statement || 'No statement available.'}"
        </p>
      </div>

      {/* Chat button */}
      <div className="px-4 pb-4">
        <button
          onClick={onChat}
          className={`
            w-full py-2 px-4 rounded-lg font-medium transition-colors
            ${isSelected
              ? 'bg-rose-600 hover:bg-rose-500 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
            }
          `}
        >
          {isSelected ? 'Continue Interview' : 'Interview'}
        </button>
      </div>
    </div>
  );
}
