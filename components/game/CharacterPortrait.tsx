'use client';

import Image from 'next/image';

interface CharacterPortraitProps {
  id: string;
  name: string;
  role: string;
  imageUrl?: string;
  isSelected?: boolean;
  onClick: () => void;
}

export function CharacterPortrait({
  id,
  name,
  role,
  imageUrl,
  isSelected,
  onClick,
}: CharacterPortraitProps) {
  return (
    <button
      onClick={onClick}
      className={`
        group relative flex-shrink-0 w-24 md:w-32 transition-all duration-300
        ${isSelected ? 'scale-110 z-10' : 'hover:scale-105'}
      `}
    >
      {/* Portrait container */}
      <div
        className={`
          relative w-24 h-28 md:w-32 md:h-36 rounded-lg overflow-hidden
          border-2 transition-all duration-300
          ${isSelected
            ? 'border-amber-400 shadow-lg shadow-amber-500/30'
            : 'border-slate-600 group-hover:border-amber-500/50'}
        `}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover object-top"
          />
        ) : (
          <div className="absolute inset-0 bg-slate-700 flex items-center justify-center">
            <span className="text-3xl">{name[0]}</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Name tag */}
      <div
        className={`
          mt-2 px-2 py-1 rounded text-center transition-all duration-300
          ${isSelected
            ? 'bg-amber-500 text-slate-900'
            : 'bg-slate-800/80 text-slate-300 group-hover:bg-slate-700'}
        `}
      >
        <p className="text-xs md:text-sm font-medium truncate">{name}</p>
        <p className="text-[10px] md:text-xs text-slate-400 truncate">{role}</p>
      </div>
    </button>
  );
}
