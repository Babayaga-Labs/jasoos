'use client';

import Image from 'next/image';
import { CharacterCard } from './CharacterCard';
import { CaseFile } from './CaseFile';
import { Timer } from './Timer';
import { useGameStore, Character } from '@/lib/store';
import type { CaseFile as CaseFileType } from '@/packages/ai/types/ugc-types';

interface GameSceneProps {
  sceneImage?: string;
  characters: Character[];
  storyId: string;
  premise?: string;
  caseFile?: CaseFileType | null;
  setting?: {
    location: string;
    timePeriod?: string;
  };
}

export function GameScene({ sceneImage, characters, storyId, premise, caseFile, setting }: GameSceneProps) {
  const { selectedCharacter, selectCharacter, openAccusation, chatHistories } = useGameStore();

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
          {/* Case File (newspaper style) or fallback to premise */}
          {caseFile && setting ? (
            <CaseFile caseFile={caseFile} setting={setting} />
          ) : premise ? (
            <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <h2 className="text-rose-400 font-semibold mb-2">The Case</h2>
              <p className="text-slate-300">{premise}</p>
            </div>
          ) : null}

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
              className="w-full py-3 px-6 rounded-lg font-semibold text-lg transition-all bg-rose-500 hover:bg-rose-400 text-white"
            >
              Make Accusation
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
