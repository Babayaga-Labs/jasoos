'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { useGameStore } from '@/lib/store';
import { useAuth } from '@/components/auth/AuthProvider';

export function ResultsModal() {
  const { isResultsOpen, accusationResult, resetGame, storyFolderId } = useGameStore();
  const { user } = useAuth();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'existing' | 'error'>('idle');

  // Save result when modal opens
  useEffect(() => {
    if (!isResultsOpen || !accusationResult || !user || !storyFolderId) return;
    if (saveStatus !== 'idle') return;

    const saveResult = async () => {
      setSaveStatus('saving');
      try {
        const response = await fetch('/api/game/save-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storyId: storyFolderId,
            score: accusationResult.score,
            timeTaken: accusationResult.timeTaken,
            reasoningScore: accusationResult.reasoningScore,
            isCorrect: accusationResult.isCorrect,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setSaveStatus(data.saved ? 'saved' : 'existing');
        } else {
          setSaveStatus('error');
        }
      } catch (error) {
        console.error('Failed to save result:', error);
        setSaveStatus('error');
      }
    };

    saveResult();
  }, [isResultsOpen, accusationResult, user, storyFolderId, saveStatus]);

  // Reset save status when modal closes
  useEffect(() => {
    if (!isResultsOpen) {
      setSaveStatus('idle');
    }
  }, [isResultsOpen]);

  if (!isResultsOpen || !accusationResult) return null;

  const { isCorrect, score, reasoningScore, timeTaken } = accusationResult;

  // Format time taken as MM:SS
  const minutes = Math.floor(timeTaken / 60);
  const seconds = timeTaken % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Determine score rating
  const getScoreRating = (score: number) => {
    if (score >= 90) return { label: 'Master Detective', color: 'text-rose-400' };
    if (score >= 70) return { label: 'Senior Detective', color: 'text-green-400' };
    if (score >= 50) return { label: 'Junior Detective', color: 'text-blue-400' };
    if (score >= 30) return { label: 'Rookie', color: 'text-slate-400' };
    return { label: 'Case Closed', color: 'text-red-400' };
  };

  const rating = getScoreRating(score);

  return (
    <Modal isOpen={true} onClose={() => {}} size="md">
      <div className="p-6 text-center">
        {/* Result banner */}
        <div className={`text-6xl mb-4 ${isCorrect ? 'animate-bounce' : ''}`}>
          {isCorrect ? '🎉' : '❌'}
        </div>

        <h2 className={`text-3xl font-bold mb-2 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
          {isCorrect ? 'Case Solved!' : 'Wrong Accusation'}
        </h2>

        <p className="text-slate-400 mb-6">
          {isCorrect
            ? 'Congratulations, detective! You\'ve cracked the case.'
            : 'The real culprit got away this time.'}
        </p>

        {/* Score display */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <div className="text-6xl font-bold text-rose-400 mb-2">
            {score}
          </div>
          <div className={`text-lg font-semibold ${rating.color}`}>
            {rating.label}
          </div>
        </div>

        {/* Stats breakdown */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{timeString}</div>
            <div className="text-sm text-slate-400">Time Taken</div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{reasoningScore}%</div>
            <div className="text-sm text-slate-400">Reasoning</div>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="text-left bg-slate-700/30 rounded-lg p-4 mb-4">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Score Breakdown</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-300">Correct Accusation</span>
              <span className={isCorrect ? 'text-green-400' : 'text-red-400'}>
                {isCorrect ? '+60' : '+0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-300">Reasoning Quality</span>
              <span className="text-rose-400">+{Math.round((reasoningScore / 100) * 40)}</span>
            </div>
            <div className="border-t border-slate-600 pt-2 flex justify-between font-semibold">
              <span className="text-white">Total</span>
              <span className="text-rose-400">{score}/100</span>
            </div>
          </div>
        </div>

        {/* Leaderboard save status */}
        {user && (
          <div className="text-sm mb-6">
            {saveStatus === 'saving' && (
              <span className="text-slate-400">Saving to leaderboard...</span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-green-400">New best score saved to leaderboard!</span>
            )}
            {saveStatus === 'existing' && (
              <span className="text-slate-400">Your previous best score is higher</span>
            )}
            {saveStatus === 'error' && (
              <span className="text-red-400">Could not save to leaderboard</span>
            )}
          </div>
        )}

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
