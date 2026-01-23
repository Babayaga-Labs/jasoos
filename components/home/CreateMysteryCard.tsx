'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { signInWithGoogle, getSiteOrigin } from '@/lib/supabase/auth';

export function CreateMysteryCard() {
  const router = useRouter();
  const { user } = useAuth();

  const handleClick = async () => {
    if (user) {
      router.push('/create');
    } else {
      console.log('getSiteOrigin(): ', getSiteOrigin());
      const callbackUrl = `${getSiteOrigin()}/auth/callback?next=/create`;
      await signInWithGoogle(callbackUrl);
    }
  };

  return (
    <button onClick={handleClick} className="block w-full text-left">
      <div className="group relative overflow-hidden rounded-lg border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm transition-all duration-700 ease-out hover:border-slate-700/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
        {/* Mysterious gradient background */}
        <div className="relative h-56 bg-gradient-to-br from-slate-950 via-slate-900 to-black overflow-hidden flex items-center justify-center">
          {/* Subtle geometric pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,.05)_25%,rgba(255,255,255,.05)_50%,transparent_50%,transparent_75%,rgba(255,255,255,.05)_75%,rgba(255,255,255,.05))] bg-[length:20px_20px]" />
          </div>
          {/* Elegant icon */}
          <div className="relative text-slate-600/40 group-hover:text-slate-500/50 transition-colors duration-500">
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/70 to-black/40" />
          <div className="absolute inset-0 ring-1 ring-inset ring-black/20" />
        </div>

        {/* Content */}
        <div className="p-5 bg-gradient-to-b from-slate-900/80 to-slate-950/90 border-t border-slate-800/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-slate-100 group-hover:text-slate-50 transition-colors duration-500 tracking-tight">
              Create Your Own Mystery
            </h3>
            <span className="px-2.5 py-1 rounded border border-slate-700/40 bg-slate-800/60 backdrop-blur-sm">
              <span className="text-[10px] font-medium text-slate-400/90 tracking-wide uppercase">UGC</span>
            </span>
          </div>

          <p className="text-slate-400/90 text-sm leading-relaxed line-clamp-2 mb-4 min-h-[2.5rem] font-light">
            Write a synopsis and let AI generate a complete detective mystery with characters, clues, and...
          </p>

          <div className="flex items-center justify-end pt-3 border-t border-slate-800/60">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 group-hover:text-slate-400 transition-colors duration-500">
              <span className="font-medium tracking-wide uppercase">Begin Creation</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </div>
        </div>

        {/* Subtle mysterious glow effect on hover */}
        <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none ring-1 ring-inset ring-slate-700/20" />
      </div>
    </button>
  );
}
