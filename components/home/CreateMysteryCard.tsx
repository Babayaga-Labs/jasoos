'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { signInWithGoogle } from '@/lib/supabase/auth';

export function CreateMysteryCard() {
  const router = useRouter();
  const { user } = useAuth();

  const handleClick = async () => {
    if (user) {
      router.push('/create');
    } else {
      const callbackUrl = `${window.location.origin}/auth/callback?next=/create`;
      await signInWithGoogle(callbackUrl);
    }
  };

  return (
    <button onClick={handleClick} className="block w-full text-left">
      <div className="card group hover:border-purple-500/50 transition-all duration-300 hover:scale-[1.02]">
        {/* Gradient background with sparkles */}
        <div className="relative h-48 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 overflow-hidden flex items-center justify-center rounded-t-lg">
          {/* Sparkle icons */}
          <div className="text-purple-400 text-5xl flex gap-1">
            <span className="text-3xl opacity-80">✦</span>
            <span className="text-4xl">✦</span>
            <span className="text-3xl opacity-80">✦</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-white group-hover:text-purple-400 transition-colors">
              Create Your Own Mystery
            </h3>
            <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/30 text-purple-300">
              UGC
            </span>
          </div>

          <p className="text-slate-400 text-sm line-clamp-2 mb-3">
            Write a synopsis and let AI generate a complete detective mystery with characters, clues, and...
          </p>

          <div className="flex items-center justify-end text-sm">
            <span className="text-purple-400 font-medium group-hover:translate-x-1 transition-transform">
              Start Creating →
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
