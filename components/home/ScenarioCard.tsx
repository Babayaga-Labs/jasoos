'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/components/auth/AuthProvider';
import { signInWithGoogle } from '@/lib/supabase/auth';
import { LeaderboardModal } from './LeaderboardModal';

interface ScenarioCardProps {
  id: string;
  title: string;
  difficulty: string;
  estimatedMinutes: number;
  premise: string;
  sceneImage?: string;
}

export function ScenarioCard({
  id,
  title,
  difficulty,
  estimatedMinutes,
  premise,
  sceneImage,
}: ScenarioCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  const handleClick = async () => {
    if (user) {
      router.push(`/game/${id}`);
    } else {
      const callbackUrl = `${window.location.origin}/auth/callback?next=/game/${id}`;
      await signInWithGoogle(callbackUrl);
    }
  };

  const handleLeaderboardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLeaderboardOpen(true);
  };

  const difficultyColors = {
    easy: 'bg-green-500/20 text-green-400',
    medium: 'bg-amber-500/20 text-amber-400',
    hard: 'bg-red-500/20 text-red-400',
  };

  return (
    <>
      <button onClick={handleClick} className="block w-full text-left">
      <div className="card group hover:border-amber-500/50 transition-all duration-300 hover:scale-[1.02]">
        {/* Scene thumbnail */}
        <div className="relative h-48 bg-slate-700 overflow-hidden">
          {sceneImage ? (
            <Image
              src={sceneImage}
              alt={title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500">
              <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
              {title}
            </h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${difficultyColors[difficulty as keyof typeof difficultyColors] || difficultyColors.medium}`}>
              {difficulty}
            </span>
          </div>

          <p className="text-slate-400 text-sm line-clamp-2 mb-3">
            {premise}
          </p>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">~{estimatedMinutes} min</span>
            <div className="flex items-center gap-3">
              <button
                onClick={handleLeaderboardClick}
                className="text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1"
                title="View Leaderboard"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <span className="text-xs">Leaderboard</span>
              </button>
              <span className="text-amber-500 font-medium group-hover:translate-x-1 transition-transform">
                Start Investigation →
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        storyId={id}
        storyTitle={title}
      />
    </>
  );
}
