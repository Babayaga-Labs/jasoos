'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { Modal } from '@/components/ui/Modal';
import { analytics } from '@/lib/analytics';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  timeTaken: number;
  isCurrentUser: boolean;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: string;
  storyTitle: string;
}

export function LeaderboardModal({ isOpen, onClose, storyId, storyTitle }: LeaderboardModalProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserEntry, setCurrentUserEntry] = useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchLeaderboard = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/leaderboard/${storyId}`);
        if (!response.ok) throw new Error('Failed to fetch');

        const data = await response.json();
        setLeaderboard(data.leaderboard);
        setCurrentUserEntry(data.currentUserEntry);

        // Track leaderboard view (only once per open)
        if (!hasTrackedRef.current) {
          hasTrackedRef.current = true;
          analytics.leaderboardViewed({
            type: 'story',
            story_id: storyId,
            story_name: storyTitle,
            user_rank: data.currentUserEntry?.rank,
          });
        }
      } catch (err) {
        setError('Could not load leaderboard');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [isOpen, storyId, storyTitle]);

  // Reset tracking when modal closes
  useEffect(() => {
    if (!isOpen) {
      hasTrackedRef.current = false;
    }
  }, [isOpen]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRankDisplay = (rank: number) => {
    if (rank === 1) return '1st';
    if (rank === 2) return '2nd';
    if (rank === 3) return '3rd';
    return `#${rank}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <p className="text-slate-400 text-sm mb-6">{storyTitle}</p>

        {isLoading && (
          <div className="text-center py-12 text-slate-400">Loading leaderboard...</div>
        )}

        {error && <div className="text-center py-12 text-red-400">{error}</div>}

        {!isLoading && !error && leaderboard.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            No scores yet. Be the first to solve this mystery!
          </div>
        )}

        {!isLoading && !error && leaderboard.length > 0 && (
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-slate-500 uppercase tracking-wide">
              <div className="col-span-2">Rank</div>
              <div className="col-span-5">Detective</div>
              <div className="col-span-3 text-right">Score</div>
              <div className="col-span-2 text-right">Time</div>
            </div>

            {/* Entries */}
            <div className="max-h-80 overflow-y-auto space-y-2">
              {leaderboard.map((entry) => (
                <div
                  key={entry.userId}
                  className={`grid grid-cols-12 gap-2 px-3 py-3 rounded-lg ${
                    entry.isCurrentUser
                      ? 'bg-rose-500/20 border border-rose-500/50'
                      : 'bg-slate-700/50'
                  }`}
                >
                  <div className="col-span-2 flex items-center">
                    <span
                      className={`font-bold ${
                        entry.rank === 1
                          ? 'text-rose-400'
                          : entry.rank === 2
                            ? 'text-slate-300'
                            : entry.rank === 3
                              ? 'text-rose-600'
                              : 'text-slate-400'
                      }`}
                    >
                      {getRankDisplay(entry.rank)}
                    </span>
                  </div>
                  <div className="col-span-5 flex items-center gap-2 min-w-0">
                    {entry.avatarUrl ? (
                      <Image
                        src={entry.avatarUrl}
                        alt={entry.displayName}
                        width={24}
                        height={24}
                        className="rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">
                        {entry.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span
                      className={`truncate ${entry.isCurrentUser ? 'text-rose-400 font-medium' : 'text-white'}`}
                    >
                      {entry.displayName}
                      {entry.isCurrentUser && ' (You)'}
                    </span>
                  </div>
                  <div className="col-span-3 text-right flex items-center justify-end">
                    <span className="text-rose-400 font-bold">{entry.score}</span>
                    <span className="text-slate-500 text-sm ml-1">/100</span>
                  </div>
                  <div className="col-span-2 text-right text-slate-300 flex items-center justify-end font-mono text-sm">
                    {formatTime(entry.timeTaken)}
                  </div>
                </div>
              ))}

              {/* Current user entry if not in top 100 */}
              {currentUserEntry && !leaderboard.some((e) => e.isCurrentUser) && (
                <>
                  <div className="text-center text-slate-500 py-2">...</div>
                  <div className="grid grid-cols-12 gap-2 px-3 py-3 rounded-lg bg-rose-500/20 border border-rose-500/50">
                    <div className="col-span-2 flex items-center">
                      <span className="font-bold text-slate-400">
                        #{currentUserEntry.rank}
                      </span>
                    </div>
                    <div className="col-span-5 flex items-center gap-2 min-w-0">
                      {currentUserEntry.avatarUrl ? (
                        <Image
                          src={currentUserEntry.avatarUrl}
                          alt={currentUserEntry.displayName}
                          width={24}
                          height={24}
                          className="rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center text-xs flex-shrink-0">
                          {currentUserEntry.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-rose-400 font-medium truncate">
                        {currentUserEntry.displayName} (You)
                      </span>
                    </div>
                    <div className="col-span-3 text-right flex items-center justify-end">
                      <span className="text-rose-400 font-bold">{currentUserEntry.score}</span>
                      <span className="text-slate-500 text-sm ml-1">/100</span>
                    </div>
                    <div className="col-span-2 text-right text-slate-300 flex items-center justify-end font-mono text-sm">
                      {formatTime(currentUserEntry.timeTaken)}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
