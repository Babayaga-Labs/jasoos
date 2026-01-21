'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/components/auth/AuthProvider';
import { signInWithGoogle } from '@/lib/supabase/auth';
import { MysteryDetailsModal } from './MysteryDetailsModal';

interface ScenarioCardProps {
  id: string;
  title: string;
  difficulty: string;
  estimatedMinutes: number;
  premise: string;
  sceneImage?: string;
  starCount?: number;
  setting?: {
    location: string;
    timePeriod?: string;
  };
}

export function ScenarioCard({
  id,
  title,
  difficulty,
  estimatedMinutes,
  premise,
  sceneImage,
  starCount: initialStarCount = 0,
  setting,
}: ScenarioCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [starCount, setStarCount] = useState(initialStarCount);

  console.log('[DEBUG] ScenarioCard render:', title, 'starCount:', starCount, 'initial:', initialStarCount);

  const handlePlay = async () => {
    if (user) {
      router.push(`/game/${id}`);
    } else {
      const callbackUrl = `${window.location.origin}/auth/callback?next=/game/${id}`;
      await signInWithGoogle(callbackUrl);
    }
  };

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDetailsOpen(true);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handlePlay();
  };

  const difficultyColors = {
    easy: 'bg-green-500/20 text-green-400',
    medium: 'bg-cyan-500/20 text-cyan-400',
    hard: 'bg-red-500/20 text-red-400',
  };

  return (
    <>
      <div className="card group relative hover:border-rose-500/50 transition-all duration-300 hover:scale-[1.02] overflow-hidden">
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
            <h3 className="text-xl font-bold text-white group-hover:text-rose-400 transition-colors line-clamp-1">
              {title}
            </h3>
            <span className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ml-2 ${difficultyColors[difficulty as keyof typeof difficultyColors] || difficultyColors.medium}`}>
              {difficulty}
            </span>
          </div>

          <p className="text-slate-400 text-sm line-clamp-2 mb-3">
            {premise}
          </p>

          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>~{estimatedMinutes} min</span>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-rose-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>{starCount}</span>
            </div>
          </div>
        </div>

        {/* Hover action bar - slides up from bottom */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
          <div className="flex bg-rose-500">
            <button
              onClick={handleDetailsClick}
              className="flex-1 py-3 px-4 flex items-center justify-center gap-2 text-white font-medium hover:bg-rose-400 transition-colors border-r border-rose-600/30"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Details
            </button>
            <button
              onClick={handlePlayClick}
              className="flex-1 py-3 px-4 flex items-center justify-center gap-2 text-white font-medium hover:bg-rose-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Play Now
            </button>
          </div>
        </div>
      </div>

      <MysteryDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onPlay={handlePlay}
        storyId={id}
        title={title}
        difficulty={difficulty}
        estimatedMinutes={estimatedMinutes}
        premise={premise}
        sceneImage={sceneImage}
        setting={setting}
        onStarChange={setStarCount}
      />
    </>
  );
}
