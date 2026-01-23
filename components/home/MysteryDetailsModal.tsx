'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/components/auth/AuthProvider';
import { FloatingParticles } from '@/components/ui/FloatingParticles';

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
  const [expandedSuspect, setExpandedSuspect] = useState<string | null>(null);

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

  const getTrophyIcon = (rank: number) => {
    if (rank === 1) {
      return (
        <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }
    if (rank === 2) {
      return (
        <svg className="w-5 h-5 text-slate-300" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }
    if (rank === 3) {
      return (
        <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }
    return null;
  };

  const difficultyColors = {
    easy: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    hard: 'bg-red-500/20 text-red-300 border-red-500/30',
  };

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        // Allow default tab behavior
        return;
      }
      if (e.key === 'Escape') {
        onClose();
      }
      // Tab switching with arrow keys
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        setActiveTab((prev) => (prev === 'about' ? 'leaderboard' : 'about'));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="flex flex-col max-h-[90vh] relative overflow-hidden animate-fade-in">
        {/* Floating particles */}
        <FloatingParticles count={15} />
        
        {/* Parchment texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Mystical glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/5 via-transparent to-amber-800/5 pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-600/30 to-transparent" />
        
        {/* Candlelight flicker effect */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl animate-pulse-slow pointer-events-none" style={{ animationDelay: '1s' }} />

        {/* Hero Image with magical frame */}
        <div className="relative h-48 md:h-64 flex-shrink-0 overflow-hidden">
          {sceneImage ? (
            <>
              <Image
                src={sceneImage}
                alt={title}
                fill
                className="object-cover"
              />
              {/* Magical vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-slate-900/40" />
              <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-transparent to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" />
          )}

          {/* Decorative corner elements */}
          <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-amber-600/30" />
          <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-amber-600/30" />

          {/* Close button - elegant */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-slate-950/60 backdrop-blur-sm rounded-lg border border-amber-600/20 hover:bg-slate-950/80 hover:border-amber-600/40 transition-all duration-300 group"
          >
            <svg className="w-5 h-5 text-amber-200/80 group-hover:text-amber-200 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Title overlay with elegant typography */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent">
            <div className="flex items-end gap-4 flex-wrap">
              <h2 className="text-3xl md:text-4xl font-[var(--font-cinzel)] font-bold text-amber-50 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] tracking-tight leading-tight">
                {title}
              </h2>
              <span className={`px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide uppercase border backdrop-blur-sm ${difficultyColors[difficulty as keyof typeof difficultyColors] || difficultyColors.medium} border-current/30`}>
                {difficulty}
              </span>
            </div>
          </div>
          
          {/* Wax seal decorative element */}
          {starCount >= 10 && (
            <div className="absolute bottom-6 right-6 w-16 h-16 opacity-60">
              <div className="relative w-full h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-600/40 to-amber-800/40 rounded-full blur-md" />
                <div className="absolute inset-2 bg-gradient-to-br from-amber-500/60 to-amber-700/60 rounded-full border-2 border-amber-600/50 flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tab Bar - elegant with decorative line */}
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-amber-600/20 flex-shrink-0 bg-gradient-to-b from-slate-900/50 to-transparent">
          {/* Decorative line above */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-600/30 to-transparent" />
          
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('about')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveTab('about');
                }
              }}
              className={`pb-2 font-medium transition-all duration-300 relative text-sm tracking-wide focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 rounded ${
                activeTab === 'about' 
                  ? 'text-amber-200' 
                  : 'text-slate-400 hover:text-amber-300/70'
              }`}
              aria-label="Case Details"
              aria-selected={activeTab === 'about'}
              role="tab"
            >
              <span className="relative z-10">Case Details</span>
              {activeTab === 'about' && (
                <>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-500 rounded-full blur-sm opacity-60" />
                </>
              )}
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActiveTab('leaderboard');
                }
              }}
              className={`pb-2 font-medium transition-all duration-300 relative text-sm tracking-wide focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-slate-900 rounded ${
                activeTab === 'leaderboard' 
                  ? 'text-amber-200' 
                  : 'text-slate-400 hover:text-amber-300/70'
              }`}
              aria-label="Hall of Fame"
              aria-selected={activeTab === 'leaderboard'}
              role="tab"
            >
              <span className="relative z-10">Hall of Fame</span>
              {activeTab === 'leaderboard' && (
                <>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-500 rounded-full blur-sm opacity-60" />
                </>
              )}
            </button>
          </div>

          {/* Star button - magical */}
          <button
            onClick={handleStarToggle}
            disabled={!user || isStarLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 border backdrop-blur-sm ${
              isStarred
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(251,191,36,0.3)] hover:shadow-[0_0_16px_rgba(251,191,36,0.4)]'
                : 'bg-slate-800/40 text-slate-300 hover:text-amber-300/80 border-amber-600/20 hover:border-amber-600/40'
            } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={!user ? 'Sign in to star' : isStarred ? 'Remove star' : 'Star this mystery'}
          >
            <svg
              className={`w-4 h-4 transition-all duration-300 ${isStarred ? 'drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]' : ''}`}
              fill={isStarred ? 'currentColor' : 'none'}
              viewBox="0 0 20 20"
              stroke="currentColor"
              strokeWidth={isStarred ? 0 : 1.5}
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-sm font-medium tabular-nums">{starCount}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 relative">
          {activeTab === 'about' && (
            <div className="space-y-8">
              {/* Premise - styled like case file text with drop cap */}
              <div className="relative animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <div className="absolute -left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-600/40 via-amber-500/30 to-transparent" />
                <p className="text-slate-200/90 leading-relaxed text-base font-[var(--font-cormorant)] pl-6 italic">
                  <span className="float-left text-6xl font-bold text-amber-400/60 leading-none mr-2 mt-1 font-[var(--font-cinzel)]">
                    {premise.charAt(0)}
                  </span>
                  {premise.slice(1)}
                </p>
              </div>

              {/* Metadata - elegant cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-3 p-4 rounded-lg border border-amber-600/20 bg-slate-900/40 backdrop-blur-sm hover:border-amber-600/40 transition-all duration-300 group">
                  <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Duration</div>
                    <div className="text-sm font-semibold text-amber-200">~{estimatedMinutes} min</div>
                  </div>
                </div>
                {setting?.location && (
                  <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-600/20 bg-slate-900/40 backdrop-blur-sm hover:border-amber-600/40 transition-all duration-300 group">
                    <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors flex-shrink-0">
                      <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Location</div>
                      <div 
                        className="text-sm font-semibold text-amber-200 line-clamp-2 break-words"
                        title={setting.location}
                      >
                        {setting.location}
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-4 rounded-lg border border-amber-600/20 bg-slate-900/40 backdrop-blur-sm hover:border-amber-600/40 transition-all duration-300 group">
                  <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Suspects</div>
                    <div className="text-sm font-semibold text-amber-200">{suspects.length}</div>
                  </div>
                </div>
              </div>

              {/* Suspects - elegant portrait cards with expandable details */}
              {suspects.length > 0 && (
                <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-px flex-1 bg-gradient-to-r from-amber-600/40 to-transparent" />
                    <h3 className="text-xl font-[var(--font-cinzel)] font-bold text-amber-200 tracking-wide">Suspects</h3>
                    <div className="h-px flex-1 bg-gradient-to-l from-amber-600/40 to-transparent" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {suspects.map((suspect, index) => (
                      <div 
                        key={suspect.id} 
                        className="group text-center p-4 rounded-lg border border-amber-600/20 bg-slate-900/30 hover:border-amber-600/40 hover:bg-slate-900/50 transition-all duration-300 cursor-pointer relative"
                        onClick={() => setExpandedSuspect(expandedSuspect === suspect.id ? null : suspect.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setExpandedSuspect(expandedSuspect === suspect.id ? null : suspect.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-expanded={expandedSuspect === suspect.id}
                        style={{ animationDelay: `${0.4 + index * 0.05}s` }}
                      >
                        <div className="relative w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden bg-slate-800 border-2 border-amber-600/30 group-hover:border-amber-500/50 transition-all duration-300 shadow-lg">
                          {suspect.imageUrl ? (
                            <Image
                              src={suspect.imageUrl}
                              alt={suspect.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-amber-300/60 text-2xl font-bold bg-gradient-to-br from-slate-800 to-slate-900">
                              {suspect.name.charAt(0)}
                            </div>
                          )}
                          {/* Mystical glow on hover */}
                          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/0 group-hover:from-amber-500/10 group-hover:to-transparent transition-all duration-300" />
                        </div>
                        <p className="text-sm font-semibold text-amber-100 truncate mb-1">{suspect.name}</p>
                        <p className="text-xs text-slate-400/80 truncate italic">{suspect.role}</p>
                        
                        {/* Expandable tooltip */}
                        {expandedSuspect === suspect.id && (
                          <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-slate-900/95 border border-amber-600/40 rounded-lg shadow-xl z-10 backdrop-blur-sm animate-fade-in-up">
                            <p className="text-xs text-amber-200/80 font-medium mb-1">{suspect.name}</p>
                            <p className="text-xs text-slate-400 italic">{suspect.role}</p>
                            <div className="mt-2 pt-2 border-t border-amber-600/20">
                              <p className="text-xs text-slate-500">Click to investigate this suspect</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isSuspectsLoading && (
                <div className="text-center py-12">
                  <div className="inline-flex flex-col items-center gap-3">
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full" />
                      <div className="absolute inset-0 border-4 border-transparent border-t-amber-500 rounded-full animate-spin" />
                    </div>
                    <span className="text-sm text-amber-300/60 font-medium">Consulting the case files...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'leaderboard' && (
            <div>
              {isLeaderboardLoading && (
                <div className="text-center py-16">
                  <div className="inline-flex flex-col items-center gap-4">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 border-4 border-amber-500/20 rounded-full" />
                      <div className="absolute inset-0 border-4 border-transparent border-t-amber-500 rounded-full animate-spin" />
                      <div className="absolute inset-2 border-4 border-amber-500/10 rounded-full" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-amber-300/80 mb-1">Consulting the records...</p>
                      <p className="text-xs text-slate-500">Gathering detective rankings</p>
                    </div>
                  </div>
                </div>
              )}

              {!isLeaderboardLoading && leaderboard.length === 0 && (
                <div className="text-center py-16">
                  <div className="inline-block p-6 rounded-lg border border-amber-600/20 bg-slate-900/30">
                    <svg className="w-12 h-12 mx-auto mb-4 text-amber-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-amber-200/80 font-medium mb-1">No records yet</p>
                    <p className="text-sm text-slate-400">Be the first to solve this mystery!</p>
                  </div>
                </div>
              )}

              {!isLeaderboardLoading && leaderboard.length > 0 && (
                <div className="space-y-3">
                  {/* Header - elegant */}
                  <div className="grid grid-cols-12 gap-3 px-4 py-3 text-xs text-amber-400/60 uppercase tracking-wider font-semibold border-b border-amber-600/20">
                    <div className="col-span-2">Rank</div>
                    <div className="col-span-5">Detective</div>
                    <div className="col-span-3 text-right">Score</div>
                    <div className="col-span-2 text-right">Time</div>
                  </div>

                  {/* Entries - elegant cards */}
                  <div className="space-y-2">
                    {leaderboard.map((entry) => (
                      <div
                        key={entry.userId}
                        className={`grid grid-cols-12 gap-3 px-4 py-3.5 rounded-lg border transition-all duration-300 ${
                          entry.isCurrentUser
                            ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_12px_rgba(251,191,36,0.15)]'
                            : entry.rank <= 3
                              ? 'bg-slate-900/40 border-amber-600/20 hover:border-amber-600/30'
                              : 'bg-slate-900/30 border-amber-600/10 hover:border-amber-600/20'
                        }`}
                      >
                        <div className="col-span-2 flex items-center gap-2">
                          {getTrophyIcon(entry.rank)}
                          <span
                            className={`font-bold text-lg ${
                              entry.rank === 1
                                ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                                : entry.rank === 2
                                  ? 'text-slate-300'
                                  : entry.rank === 3
                                    ? 'text-amber-600'
                                    : 'text-slate-400'
                            }`}
                          >
                            {getRankDisplay(entry.rank)}
                          </span>
                        </div>
                        <div className="col-span-5 flex items-center gap-3 min-w-0">
                          {entry.avatarUrl ? (
                            <div className="relative flex-shrink-0">
                              <Image
                                src={entry.avatarUrl}
                                alt={entry.displayName}
                                width={32}
                                height={32}
                                className="rounded-full border-2 border-amber-600/30"
                              />
                              {entry.rank === 1 && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border-2 border-slate-900 flex items-center justify-center">
                                  <svg className="w-2.5 h-2.5 text-amber-900" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center text-xs font-bold text-amber-300/70 border border-amber-600/30 flex-shrink-0">
                              {entry.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span
                            className={`truncate font-medium ${
                              entry.isCurrentUser 
                                ? 'text-amber-300' 
                                : entry.rank <= 3
                                  ? 'text-amber-200/90'
                                  : 'text-slate-200'
                            }`}
                          >
                            {entry.displayName}
                            {entry.isCurrentUser && (
                              <span className="ml-2 text-xs text-amber-400/70">(You)</span>
                            )}
                          </span>
                        </div>
                        <div className="col-span-3 text-right flex items-center justify-end gap-1">
                          <span className="text-amber-400 font-bold text-lg">{entry.score}</span>
                          <span className="text-slate-500 text-xs">/100</span>
                        </div>
                        <div className="col-span-2 text-right text-amber-300/80 flex items-center justify-end font-mono text-sm font-medium">
                          {formatTime(entry.timeTaken)}
                        </div>
                      </div>
                    ))}

                    {/* Current user entry if not in top 100 */}
                    {currentUserEntry && !leaderboard.some((e) => e.isCurrentUser) && (
                      <>
                        <div className="text-center py-4">
                          <div className="inline-flex items-center gap-2 text-amber-600/40">
                            <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-600/40" />
                            <span className="text-xs font-medium">Your Position</span>
                            <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-600/40" />
                          </div>
                        </div>
                        <div className="grid grid-cols-12 gap-3 px-4 py-3.5 rounded-lg bg-amber-500/10 border border-amber-500/40 shadow-[0_0_12px_rgba(251,191,36,0.15)]">
                          <div className="col-span-2 flex items-center">
                            <span className="font-bold text-lg text-amber-300">
                              #{currentUserEntry.rank}
                            </span>
                          </div>
                          <div className="col-span-5 flex items-center gap-3 min-w-0">
                            {currentUserEntry.avatarUrl ? (
                              <Image
                                src={currentUserEntry.avatarUrl}
                                alt={currentUserEntry.displayName}
                                width={32}
                                height={32}
                                className="rounded-full border-2 border-amber-500/40 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-800 rounded-full flex items-center justify-center text-xs font-bold text-amber-300 border border-amber-500/40 flex-shrink-0">
                                {currentUserEntry.displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-amber-300 font-medium truncate">
                              {currentUserEntry.displayName}
                              <span className="ml-2 text-xs text-amber-400/70">(You)</span>
                            </span>
                          </div>
                          <div className="col-span-3 text-right flex items-center justify-end gap-1">
                            <span className="text-amber-400 font-bold text-lg">{currentUserEntry.score}</span>
                            <span className="text-slate-500 text-xs">/100</span>
                          </div>
                          <div className="col-span-2 text-right text-amber-300/80 flex items-center justify-end font-mono text-sm font-medium">
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

        {/* Sticky CTA - magical button */}
        <div className="p-6 border-t border-amber-600/20 flex-shrink-0 bg-gradient-to-b from-transparent to-slate-900/50">
          <button
            onClick={onPlay}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPlay();
              }
            }}
            className="group relative w-full py-4 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:via-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_4px_20px_rgba(251,191,36,0.3)] hover:shadow-[0_6px_30px_rgba(251,191,36,0.5)] overflow-hidden focus:outline-none focus:ring-4 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-slate-900"
            aria-label="Begin Investigation"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            
            {/* Button content */}
            <svg className="w-5 h-5 relative z-10" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
            <span className="relative z-10 tracking-wide">Begin Investigation</span>
            
            {/* Mystical glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-amber-300/20 to-amber-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />
          </button>
        </div>
      </div>
    </Modal>
  );
}
