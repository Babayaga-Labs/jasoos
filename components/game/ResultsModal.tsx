'use client';

import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { useGameStore } from '@/lib/store';

export function ResultsModal() {
  const { isResultsOpen, accusationResult, gameStatus, story, resetGame } = useGameStore();

  if (!isResultsOpen || !accusationResult || !story) return null;

  const isCorrect = accusationResult.isCorrect;

  return (
    <Modal isOpen={true} onClose={() => {}} size="md">
      <div className="p-6 text-center">
        {/* Result banner */}
        <div
          className={`text-6xl mb-4 ${isCorrect ? 'animate-bounce' : ''}`}
        >
          {isCorrect ? '🎉' : '❌'}
        </div>

        <h2
          className={`text-3xl font-bold mb-2 ${
            isCorrect ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {isCorrect ? 'Case Solved!' : 'Wrong Accusation'}
        </h2>

        <p className="text-slate-400 mb-6">
          {isCorrect
            ? 'Congratulations, detective! You\'ve cracked the case.'
            : 'The real culprit got away this time.'}
        </p>

        {/* Score */}
        <div className="bg-slate-700/50 rounded-xl p-6 mb-6">
          <div className="text-5xl font-bold text-amber-400 mb-2">
            {accusationResult.score}
          </div>
          <div className="text-slate-400">Final Score</div>
        </div>

        {/* Explanation */}
        <div className="bg-slate-800 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-amber-400 mb-2">What Really Happened:</h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            {story.solution.explanation}
          </p>
          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-sm">
              <span className="text-slate-400">The culprit:</span>{' '}
              <span className="text-amber-400 font-medium">{story.solution.culprit}</span>
            </p>
            <p className="text-sm mt-1">
              <span className="text-slate-400">Method:</span>{' '}
              <span className="text-slate-300">{story.solution.method}</span>
            </p>
            <p className="text-sm mt-1">
              <span className="text-slate-400">Motive:</span>{' '}
              <span className="text-slate-300">{story.solution.motive}</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Link href="/" onClick={resetGame} className="btn btn-secondary">
            Back to Cases
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Play Again
          </button>
        </div>
      </div>
    </Modal>
  );
}
