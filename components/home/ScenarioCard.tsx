'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/components/auth/AuthProvider';
import { signInWithGoogle, getSiteOrigin } from '@/lib/supabase/auth';
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
  const [isHovered, setIsHovered] = useState(false);

  console.log('[DEBUG] ScenarioCard render:', title, 'starCount:', starCount, 'initial:', initialStarCount);

  const handlePlay = async () => {
    if (user) {
      router.push(`/game/${id}`);
    } else {
      console.log('getSiteOrigin(): ', getSiteOrigin());
      const callbackUrl = `${getSiteOrigin()}/auth/callback?next=/game/${id}`;
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
    easy: {
      bg: 'bg-emerald-950/40',
      text: 'text-emerald-200/90',
      border: 'border-emerald-800/30',
    },
    medium: {
      bg: 'bg-slate-800/60',
      text: 'text-slate-200/90',
      border: 'border-slate-600/30',
    },
    hard: {
      bg: 'bg-amber-950/40',
      text: 'text-amber-200/90',
      border: 'border-amber-800/30',
    },
  };

  const difficultyConfig = difficultyColors[difficulty as keyof typeof difficultyColors] || difficultyColors.medium;
  const isNotable = starCount >= 10;

  return (
    <>
      <div
        className="group relative overflow-hidden cursor-pointer rounded-lg border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm transition-all duration-700 ease-out hover:border-slate-700/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
        onClick={handleDetailsClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          boxShadow: isHovered
            ? '0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(148, 163, 184, 0.05)'
            : '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
        }}
      >
        {/* Scene thumbnail with mysterious depth */}
        <div className="relative h-56 bg-gradient-to-br from-slate-950 via-slate-900 to-black overflow-hidden">
          {sceneImage ? (
            <>
              <Image
                src={sceneImage}
                alt={title}
                fill
                className="object-cover transition-all duration-1000 ease-out group-hover:scale-[1.03] group-hover:brightness-[0.85]"
                priority={false}
              />
              {/* Dark, mysterious gradient overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/40" />
              <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/50" />
              {/* Subtle vignette effect */}
              <div className="absolute inset-0 ring-1 ring-inset ring-black/20" />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-700/40">
              <svg className="w-16 h-16 transition-opacity duration-500 group-hover:opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Minimal badges - top right */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {isNotable && (
              <div className="px-2.5 py-1 rounded border border-amber-800/40 bg-amber-950/30 backdrop-blur-sm">
                <span className="text-[10px] font-medium text-amber-200/80 tracking-wide uppercase">Notable</span>
              </div>
            )}
            <div className={`px-2.5 py-1 rounded border backdrop-blur-sm ${difficultyConfig.bg} ${difficultyConfig.border}`}>
              <span className={`text-[10px] font-medium ${difficultyConfig.text} tracking-wide uppercase`}>{difficulty}</span>
            </div>
          </div>

          {/* Star count - subtle, elegant */}
          {starCount > 0 && (
            <div className="absolute bottom-4 left-4 flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-slate-700/40 bg-black/40 backdrop-blur-md">
              <svg className="w-3.5 h-3.5 text-amber-300/70 fill-amber-300/40" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-xs font-medium text-slate-200/90 tabular-nums">{starCount}</span>
            </div>
          )}
        </div>

        {/* Content with refined hierarchy */}
        <div className="p-5 bg-gradient-to-b from-slate-900/80 to-slate-950/90 border-t border-slate-800/50">
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-slate-100 mb-1.5 group-hover:text-slate-50 transition-colors duration-500 line-clamp-1 leading-tight tracking-tight">
              {title}
            </h3>
            {setting && (
              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1.5">
                {setting.location && (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium">{setting.location}</span>
                  </span>
                )}
                {setting.timePeriod && (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">{setting.timePeriod}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          <p className="text-slate-400/90 text-sm leading-relaxed line-clamp-2 mb-4 min-h-[2.5rem] font-light">
            {premise}
          </p>

          {/* Refined metadata row */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium tabular-nums">{estimatedMinutes}</span>
              <span>min</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400/80 group-hover:text-slate-300 transition-colors duration-500">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              <span className="text-[11px] font-medium tracking-wide uppercase">Investigate</span>
            </div>
          </div>
        </div>

        {/* Elegant hover action bar - slides up subtly */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-all duration-700 ease-out">
          <div className="flex bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 backdrop-blur-md border-t border-slate-700/40 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
            <button
              onClick={handleDetailsClick}
              className="flex-1 py-4 px-5 flex items-center justify-center gap-2 text-slate-200 font-medium hover:bg-slate-800/40 active:bg-slate-800/60 transition-all duration-300 border-r border-slate-800/60 group/btn"
            >
              <svg className="w-4 h-4 transition-opacity duration-300 group-hover/btn:opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-sm tracking-wide">Details</span>
            </button>
            <button
              onClick={handlePlayClick}
              className="flex-1 py-4 px-5 flex items-center justify-center gap-2 text-slate-200 font-medium hover:bg-slate-800/40 active:bg-slate-800/60 transition-all duration-300 group/btn"
            >
              <svg className="w-4 h-4 transition-opacity duration-300 group-hover/btn:opacity-80" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              <span className="text-sm tracking-wide">Begin</span>
            </button>
          </div>
        </div>

        {/* Subtle mysterious glow effect on hover */}
        <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none ring-1 ring-inset ring-slate-700/20" />
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
