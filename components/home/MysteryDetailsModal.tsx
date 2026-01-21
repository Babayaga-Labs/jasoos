'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/components/auth/AuthProvider';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  timeTaken: number;
  isCurrentUser: boolean;
}

interface Suspect {
  id: string;
  name: string;
  role: string;
  imageUrl?: string;
}

interface MysteryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlay: () => void;
  storyId: string;
  title: string;
  difficulty: string;
  estimatedMinutes: number;
  premise: string;
  sceneImage?: string;
  setting?: {
    location: string;
    timePeriod?: string;
  };
  onStarChange?: (newCount: number) => void;
}

export function MysteryDetailsModal({
  isOpen,
  onClose,
  onPlay,
  storyId,
  title,
  difficulty,
  estimatedMinutes,
  premise,
  sceneImage,
  setting,
  onStarChange,
}: MysteryDetailsModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'about' | 'leaderboard'>('about');
  const [isStarred, setIsStarred] = useState(false);
  const [starCount, setStarCount] = useState(0);
  const [isStarLoading, setIsStarLoading] = useState(false);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserEntry, setCurrentUserEntry] = useState<LeaderboardEntry | null>(null);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);

  // Suspects state
  const [suspects, setSuspects] = useState<Suspect[]>([]);
  const [isSuspectsLoading, setIsSuspectsLoading] = useState(false);

  // Fetch star status when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchStars = async () => {
      try {
        const response = await fetch(`/api/stars/${storyId}`);
        if (response.ok) {
          const data = await response.json();
          setStarCount(data.starCount);
          setIsStarred(data.isStarred);
        }
      } catch (err) {
        console.error('Failed to fetch star status:', err);
      }
    };

    fetchStars();
  }, [isOpen, storyId]);

  // Fetch suspects when About tab is active
  useEffect(() => {
    if (!isOpen || activeTab !== 'about') return;

    const fetchSuspects = async () => {
      setIsSuspectsLoading(true);
      try {
        const response = await fetch(`/api/game/characters/${storyId}`);
        if (response.ok) {
          const data = await response.json();
          // Filter to only show non-victim characters
          const suspectList = data.characters
            ?.filter((c: { isVictim: boolean }) => !c.isVictim)
            .map((c: { id: string; name: string; role: string; imageUrl?: string }) => ({
              id: c.id,
              name: c.name,
              role: c.role,
              imageUrl: c.imageUrl,
            })) || [];
          setSuspects(suspectList);
        }
      } catch (err) {
        console.error('Failed to fetch suspects:', err);
      } finally {
        setIsSuspectsLoading(false);
      }
    };

    if (suspects.length === 0) {
      fetchSuspects();
    }
  }, [isOpen, activeTab, storyId, suspects.length]);

  // Fetch leaderboard when Leaderboard tab is active
  useEffect(() => {
    if (!isOpen || activeTab !== 'leaderboard') return;

    const fetchLeaderboard = async () => {
      setIsLeaderboardLoading(true);
      try {
        const response = await fetch(`/api/leaderboard/${storyId}`);
        if (response.ok) {
          const data = await response.json();
          setLeaderboard(data.leaderboard);
          setCurrentUserEntry(data.currentUserEntry);
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setIsLeaderboardLoading(false);
      }
    };

    fetchLeaderboard();
  }, [isOpen, activeTab, storyId]);

  const handleStarToggle = async () => {
    if (!user || isStarLoading) return;

    setIsStarLoading(true);
    try {
      if (isStarred) {
        const response = await fetch(`/api/stars/${storyId}`, { method: 'DELETE' });
        if (response.ok) {
          const newCount = Math.max(0, starCount - 1);
          setIsStarred(false);
          setStarCount(newCount);
          console.log('[DEBUG] Calling onStarChange with:', newCount, 'callback exists:', !!onStarChange);
          onStarChange?.(newCount);
        }
      } else {
        const response = await fetch(`/api/stars/${storyId}`, { method: 'POST' });
        if (response.ok) {
          const newCount = starCount + 1;
          setIsStarred(true);
          setStarCount(newCount);
          console.log('[DEBUG] Calling onStarChange with:', newCount, 'callback exists:', !!onStarChange);
          onStarChange?.(newCount);
        }
      }
    } catch (err) {
      console.error('Failed to toggle star:', err);
    } finally {
      setIsStarLoading(false);
    }
  };

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

  const difficultyColors = {
    easy: 'bg-green-500/20 text-green-400',
    medium: 'bg-cyan-500/20 text-cyan-400',
    hard: 'bg-red-500/20 text-red-400',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex flex-col max-h-[90vh]">
        {/* Hero Image */}
        <div className="relative h-48 md:h-64 flex-shrink-0">
          {sceneImage ? (
            <Image
              src={sceneImage}
              alt={title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-slate-700" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-800 via-slate-800/50 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-slate-900/50 rounded-full hover:bg-slate-900/80 transition-colors"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Title overlay */}
          <div className="absolute bottom-4 left-6 right-6">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{title}</h2>
              <span className={`px-3 py-1 rounded text-sm font-medium ${difficultyColors[difficulty as keyof typeof difficultyColors] || difficultyColors.medium}`}>
                {difficulty}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-700 flex-shrink-0">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('about')}
              className={`pb-2 font-medium transition-colors relative ${
                activeTab === 'about' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              About
              {activeTab === 'about' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`pb-2 font-medium transition-colors relative ${
                activeTab === 'leaderboard' ? 'text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Leaderboard
              {activeTab === 'leaderboard' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500" />
              )}
            </button>
          </div>

          {/* Star button */}
          <button
            onClick={handleStarToggle}
            disabled={!user || isStarLoading}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
              isStarred
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-transparent'
            } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={!user ? 'Sign in to star' : isStarred ? 'Remove star' : 'Star this mystery'}
          >
            <svg
              className="w-4 h-4"
              fill={isStarred ? 'currentColor' : 'none'}
              viewBox="0 0 20 20"
              stroke="currentColor"
              strokeWidth={isStarred ? 0 : 1.5}
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-sm">{starCount}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'about' && (
            <div className="space-y-6">
              {/* Premise */}
              <p className="text-slate-300 leading-relaxed">{premise}</p>

              {/* Metadata */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>~{estimatedMinutes} minutes</span>
                </div>
                {setting?.location && (
                  <div className="flex items-center gap-2 text-slate-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{setting.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>{suspects.length} suspects</span>
                </div>
              </div>

              {/* Suspects */}
              {suspects.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Suspects</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {suspects.map((suspect) => (
                      <div key={suspect.id} className="text-center">
                        <div className="relative w-16 h-16 mx-auto mb-2 rounded-full overflow-hidden bg-slate-700">
                          {suspect.imageUrl ? (
                            <Image
                              src={suspect.imageUrl}
                              alt={suspect.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xl font-bold">
                              {suspect.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <p className="text-sm font-medium text-white truncate">{suspect.name}</p>
                        <p className="text-xs text-slate-400 truncate">{suspect.role}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isSuspectsLoading && (
                <div className="text-center py-4 text-slate-400">Loading suspects...</div>
              )}
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div>
              {isLeaderboardLoading && (
                <div className="text-center py-12 text-slate-400">Loading leaderboard...</div>
              )}

              {!isLeaderboardLoading && leaderboard.length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  No scores yet. Be the first to solve this mystery!
                </div>
              )}

              {!isLeaderboardLoading && leaderboard.length > 0 && (
                <div className="space-y-2">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs text-slate-500 uppercase tracking-wide">
                    <div className="col-span-2">Rank</div>
                    <div className="col-span-5">Detective</div>
                    <div className="col-span-3 text-right">Score</div>
                    <div className="col-span-2 text-right">Time</div>
                  </div>

                  {/* Entries */}
                  <div className="space-y-2">
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
          )}
        </div>

        {/* Sticky CTA */}
        <div className="p-6 border-t border-slate-700 flex-shrink-0">
          <button
            onClick={onPlay}
            className="w-full py-4 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            Start Investigation
          </button>
        </div>
      </div>
    </Modal>
  );
}
