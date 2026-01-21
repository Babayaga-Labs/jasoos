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
  const [motive, setMotive] = useState('');
  const [method, setMethod] = useState('');

  const { isAccusationOpen, closeAccusation, submitAccusation, isLoading } = useGameStore();

  const handleSubmit = async () => {
    if (!selectedSuspect || !motive.trim() || !method.trim()) return;
    // Combine motive and method into reasoning for the LLM judge
    const reasoning = `MOTIVE: ${motive.trim()}\n\nMETHOD: ${method.trim()}`;
    await submitAccusation(selectedSuspect, reasoning);
  };

  if (!isAccusationOpen) return null;

  return (
    <Modal isOpen={true} onClose={closeAccusation} size="lg">
      <div className="p-6 overflow-y-auto max-h-[calc(90vh-2rem)]">
        <h2 className="text-2xl font-bold text-rose-400 mb-2">
          Make Your Accusation
        </h2>
        <p className="text-slate-400 mb-6">
          Choose who you believe committed the crime and explain your reasoning.
        </p>

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
                    ? 'border-rose-500 bg-rose-500/10'
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

        {/* Motive */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Why did they commit the crime?
          </label>
          <textarea
            value={motive}
            onChange={(e) => setMotive(e.target.value)}
            placeholder="What was their motive? What drove them to do this?"
            rows={3}
            className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
          />
        </div>

        {/* Method */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            How did they do it?
          </label>
          <textarea
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="How did they commit the crime? What was their method?"
            rows={3}
            className="w-full bg-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button onClick={closeAccusation} className="btn btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedSuspect || !motive.trim() || !method.trim() || isLoading}
            className="btn btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Submitting...' : 'Submit Accusation'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
