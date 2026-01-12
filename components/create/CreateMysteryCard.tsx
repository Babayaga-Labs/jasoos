'use client';

import Link from 'next/link';

export function CreateMysteryCard() {
  return (
    <Link href="/create" className="block">
      <div className="card group hover:border-amber-500/50 transition-all duration-300 hover:scale-[1.02] h-full">
        {/* Gradient background instead of image */}
        <div className="relative h-48 bg-gradient-to-br from-amber-900/40 via-slate-800 to-purple-900/40 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl group-hover:scale-110 transition-transform duration-300">
              ✨
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
              Create Your Own Mystery
            </h3>
            <span className="px-2 py-1 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
              UGC
            </span>
          </div>

          <p className="text-slate-400 text-sm line-clamp-2 mb-3">
            Write a synopsis and let AI generate a complete detective mystery with characters, clues, and artwork.
          </p>

          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">
              ~5 min to generate
            </span>
            <span className="text-amber-500 font-medium group-hover:translate-x-1 transition-transform">
              Start Creating →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
