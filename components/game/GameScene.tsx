'use client';

import Image from 'next/image';
import { CharacterCard } from './CharacterCard';
import { Timer } from './Timer';
import { useGameStore, Character } from '@/lib/store';

interface GameSceneProps {
  sceneImage?: string;
  characters: Character[];
  storyId: string;
  premise?: string;
}

export function GameScene({ sceneImage, characters, storyId, premise }: GameSceneProps) {
  const { selectedCharacter, selectCharacter, openAccusation, chatHistories, isTimeUp } = useGameStore();

  return (
    <div className="relative w-full min-h-screen bg-slate-900">
      {/* Background - subtle scene image */}
      {sceneImage && (
        <div className="fixed inset-0 opacity-20">
          <Image
            src={sceneImage}
            alt="Crime scene"
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur border-b border-slate-700">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" className="text-slate-400 hover:text-white transition-colors">
              ← Back to Stories
            </a>
            <Timer />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
          {/* Premise */}
          {premise && (
            <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <h2 className="text-amber-400 font-semibold mb-2">The Case</h2>
              <p className="text-slate-300">{premise}</p>
            </div>
          )}

          {/* Section header */}
          <h2 className="text-lg font-semibold text-slate-300 mb-4">
            Suspects & Witnesses
          </h2>

          {/* Character cards grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {characters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                storyId={storyId}
                isSelected={selectedCharacter === character.id}
                hasMessages={(chatHistories[character.id]?.length || 0) > 0}
                onChat={() => selectCharacter(character.id)}
              />
            ))}
          </div>
        </main>

        {/* Footer - Accusation button */}
        <footer className="sticky bottom-0 z-20 bg-slate-900/95 backdrop-blur border-t border-slate-700">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <button
              onClick={openAccusation}
              className={`
                w-full py-3 px-6 rounded-lg font-semibold text-lg transition-all
                ${isTimeUp
                  ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                  : 'bg-amber-600 hover:bg-amber-500 text-white'
                }
              `}
            >
              {isTimeUp ? 'Time\'s Up! Make Your Accusation' : 'Make Accusation'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
