'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Modal } from '@/components/ui/Modal';
import { useGameStore, Character } from '@/lib/store';

interface AccusationModalProps {
  characters: Character[];
  storyId: string;
}

export function AccusationModal({ characters, storyId }: AccusationModalProps) {
  const [selectedSuspect, setSelectedSuspect] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState('');

  const { isAccusationOpen, closeAccusation, submitAccusation, isLoading, isTimeUp } = useGameStore();

  const handleSubmit = async () => {
    if (!selectedSuspect || !reasoning.trim()) return;
    await submitAccusation(selectedSuspect, reasoning);
  };

  if (!isAccusationOpen) return null;

  return (
    <Modal isOpen={true} onClose={closeAccusation} size="lg">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-amber-400 mb-2">
          {isTimeUp ? "Time's Up! Make Your Final Accusation" : 'Make Your Accusation'}
        </h2>
        <p className="text-slate-400 mb-6">
          Choose who you believe committed the crime and explain your reasoning.
        </p>

        {isTimeUp && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-400 text-sm">
              Time has run out! You must make your accusation now.
            </p>
          </div>
        )}

        {/* Suspect selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Who do you accuse?
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {characters.map((character) => (
              <button
                key={character.id}
                onClick={() => setSelectedSuspect(character.id)}
                className={`
                  p-3 rounded-lg border-2 transition-all
                  ${selectedSuspect === character.id
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-600 hover:border-slate-500 bg-slate-700/50'}
                `}
              >
                <div className="relative w-16 h-16 mx-auto rounded-full overflow-hidden mb-2 bg-slate-600">
                  <Image
                    src={character.imageUrl || `/stories/${storyId}/assets/characters/${character.id}.png`}
                    alt={character.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <p className="text-sm font-medium text-center truncate">{character.name}</p>
                <p className="text-xs text-slate-400 text-center truncate">{character.role}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Reasoning */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Your reasoning
          </label>
          <textarea
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder="Explain why you believe this person is guilty. What did you learn from your interviews?"
            rows={4}
            className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          {!isTimeUp && (
            <button onClick={closeAccusation} className="btn btn-secondary">
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!selectedSuspect || !reasoning.trim() || isLoading}
            className="btn btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Submitting...' : 'Submit Accusation'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
