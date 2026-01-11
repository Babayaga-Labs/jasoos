'use client';

import Image from 'next/image';
import { CharacterPortrait } from './CharacterPortrait';
import { useGameStore, Character } from '@/lib/store';

interface GameSceneProps {
  sceneImage?: string;
  characters: Character[];
  storyId: string;
}

export function GameScene({ sceneImage, characters, storyId }: GameSceneProps) {
  const { selectedCharacter, selectCharacter, isNotepadOpen, toggleNotepad, openAccusation, newEvidenceCount, currentScore, unlockedPlotPoints, plotPoints } = useGameStore();

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Background scene */}
      <div className="absolute inset-0">
        {sceneImage ? (
          <Image
            src={sceneImage}
            alt="Crime scene"
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-slate-900" />
        )}
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between p-4">
          <a href="/" className="text-slate-400 hover:text-white transition-colors">
            ← Back
          </a>
          <div className="text-amber-400 font-medium">
            {currentScore} pts
          </div>
        </div>

        {/* Characters row - centered at bottom third */}
        <div className="flex-1 flex items-end justify-center pb-32 md:pb-40">
          <div className="flex gap-3 md:gap-6 px-4 overflow-x-auto pb-4 max-w-full">
            {characters.map((character) => (
              <CharacterPortrait
                key={character.id}
                id={character.id}
                name={character.name}
                role={character.role}
                imageUrl={`/stories/${storyId}/assets/characters/${character.id}.png`}
                isSelected={selectedCharacter === character.id}
                onClick={() => selectCharacter(character.id)}
              />
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent">
          {/* Notepad button */}
          <button
            onClick={toggleNotepad}
            className="btn btn-secondary relative"
          >
            <span className="mr-2">📒</span>
            Evidence ({unlockedPlotPoints.length}/{plotPoints.length})
            {newEvidenceCount > 0 && (
              <span className="badge animate-pulse">{newEvidenceCount}</span>
            )}
          </button>

          {/* Accuse button */}
          <button
            onClick={openAccusation}
            className="btn btn-danger"
          >
            <span className="mr-2">⚖️</span>
            Make Accusation
          </button>
        </div>
      </div>
    </div>
  );
}
