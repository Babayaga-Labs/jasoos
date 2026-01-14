'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { GameScene } from '@/components/game/GameScene';
import { ChatModal } from '@/components/game/ChatModal';
import { AccusationModal } from '@/components/game/AccusationModal';
import { ResultsModal } from '@/components/game/ResultsModal';
import { useGameStore } from '@/lib/store';

export default function GamePage() {
  const params = useParams();
  const storyId = params.storyId as string;

  const {
    story,
    characters,
    selectedCharacter,
    selectCharacter,
    loadStory,
    isLoading,
    gameStatus,
  } = useGameStore();

  // Load story on mount
  useEffect(() => {
    if (storyId && gameStatus === 'idle') {
      loadStory(storyId);
    }
  }, [storyId, gameStatus, loadStory]);

  // Loading state
  if (isLoading || !story) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading case files...</p>
        </div>
      </div>
    );
  }

  const selectedCharacterData = characters.find(c => c.id === selectedCharacter);

  return (
    <div className="min-h-screen">
      {/* Main game scene */}
      <GameScene
        sceneImage={`/stories/${storyId}/assets/scene.png`}
        characters={characters}
        storyId={storyId}
        premise={story.premise}
      />

      {/* Chat modal */}
      {selectedCharacterData && (
        <ChatModal
          character={selectedCharacterData}
          storyId={storyId}
          onClose={() => selectCharacter(null)}
        />
      )}

      {/* Accusation modal */}
      <AccusationModal characters={characters} storyId={storyId} />

      {/* Results modal */}
      <ResultsModal />
    </div>
  );
}
