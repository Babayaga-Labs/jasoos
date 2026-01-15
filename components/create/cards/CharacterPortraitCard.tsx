'use client';

import Image from 'next/image';
import type { UGCGeneratedCharacter } from '@/packages/ai/types/ugc-types';

interface CharacterPortraitCardProps {
  character: UGCGeneratedCharacter;
  onEdit?: () => void;
  onDelete?: () => void;
  onRegenerate?: () => void;
  delay?: number;
  isCompact?: boolean;
}

export function CharacterPortraitCard({
  character,
  onEdit,
  onDelete,
  onRegenerate,
  delay = 0,
  isCompact = false,
}: CharacterPortraitCardProps) {
  if (isCompact) {
    return (
      <div
        className="opacity-0 animate-fade-in-up"
        style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
      >
        <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/30 group hover:border-violet-500/30 transition-colors">
          {/* Portrait */}
          <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-slate-700/50">
            {character.imageUrl ? (
              <Image
                src={character.imageUrl}
                alt={character.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">
                {character.isVictim ? '💀' : '👤'}
              </div>
            )}
            {character.isVictim && (
              <div className="absolute inset-0 bg-red-900/40 flex items-center justify-center">
                <span className="text-xs font-bold text-red-300">VICTIM</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-white truncate">{character.name}</h4>
            <p className="text-sm text-slate-400 truncate">{character.role}</p>
          </div>

          {/* Actions */}
          {(onDelete || onRegenerate) && (
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="p-2 rounded-lg bg-violet-600/20 text-violet-400 hover:bg-violet-500/30 transition-colors"
                  title="Regenerate"
                >
                  ↻
                </button>
              )}
              {onDelete && (
                <button
                  onClick={onDelete}
                  className="p-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  title="Delete"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40 backdrop-blur-sm overflow-hidden group hover:border-violet-500/30 transition-colors">
        {/* Victim badge */}
        {character.isVictim && (
          <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-red-500/80 text-white text-xs font-bold z-10">
            VICTIM
          </div>
        )}

        <div className="flex flex-col md:flex-row">
          {/* Portrait */}
          <div className="relative w-full md:w-48 h-48 md:h-auto flex-shrink-0 bg-slate-700/30">
            {character.imageUrl ? (
              <Image
                src={character.imageUrl}
                alt={character.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl text-slate-600">
                {character.isVictim ? '💀' : '👤'}
              </div>
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent md:bg-gradient-to-r" />
          </div>

          {/* Content */}
          <div className="flex-1 p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-white">{character.name}</h3>
                <p className="text-violet-400">{character.role}</p>
                <p className="text-sm text-slate-500">{character.age} years old</p>
              </div>

              {/* Actions */}
              {(onEdit || onDelete || onRegenerate) && (
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onRegenerate && (
                    <button
                      onClick={onRegenerate}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600/30 text-violet-300 hover:bg-violet-500/40 transition-colors"
                    >
                      Regenerate
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={onDelete}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600/30 text-red-300 hover:bg-red-500/40 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Personality */}
            <div className="mb-4">
              <div className="flex flex-wrap gap-2">
                {character.personality.traits.map((trait, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 text-xs rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/20"
                  >
                    {trait}
                  </span>
                ))}
              </div>
              <p className="text-sm text-slate-400 mt-2 italic">
                "{character.personality.speechStyle}"
              </p>
            </div>

            {/* Statement */}
            <div className="p-3 rounded-lg bg-slate-700/30 border border-slate-600/30">
              <p className="text-sm text-slate-300">{character.statement}</p>
            </div>

            {/* Quirks */}
            {character.personality.quirks.length > 0 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <span>Quirks:</span>
                <span className="text-slate-400">{character.personality.quirks.join(' • ')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface CharacterSkeletonProps {
  delay?: number;
}

export function CharacterSkeleton({ delay = 0 }: CharacterSkeletonProps) {
  return (
    <div
      className="opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Portrait skeleton */}
          <div className="relative w-full md:w-48 h-48 bg-slate-700/30 animate-pulse-slow" />

          {/* Content skeleton */}
          <div className="flex-1 p-5 space-y-4">
            <div className="space-y-2">
              <div className="h-6 w-1/3 bg-slate-700/50 rounded animate-pulse-slow" />
              <div className="h-4 w-1/4 bg-slate-700/30 rounded animate-pulse-slow" />
            </div>
            <div className="flex gap-2">
              <div className="h-6 w-16 bg-amber-500/10 rounded-full animate-pulse-slow" />
              <div className="h-6 w-20 bg-amber-500/10 rounded-full animate-pulse-slow" />
              <div className="h-6 w-14 bg-amber-500/10 rounded-full animate-pulse-slow" />
            </div>
            <div className="h-20 bg-slate-700/20 rounded-lg animate-pulse-slow" />
          </div>
        </div>

        {/* Shimmer */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-600/10 to-transparent animate-shimmer"
          style={{ backgroundSize: '200% 100%' }}
        />
      </div>
    </div>
  );
}
