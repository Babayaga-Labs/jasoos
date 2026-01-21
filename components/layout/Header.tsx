'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LoginButton } from '@/components/auth/LoginButton';
import { UserMenu } from '@/components/auth/UserMenu';
import { useAuth } from '@/components/auth/AuthProvider';
import { GlobalLeaderboardModal } from '@/components/home/GlobalLeaderboardModal';

export function Header() {
  const { user, isLoading } = useAuth();
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  return (
    <>
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-red-600">
              Open Cases
            </span>
          </Link>

          <nav className="flex items-center gap-4">
            {/* Leaderboard button */}
            <button
              onClick={() => setIsLeaderboardOpen(true)}
              className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
            >
              <span className="text-lg">🏆</span>
              <span className="hidden sm:inline">Leaderboard</span>
            </button>

            {!isLoading && (
              <>
                {user ? (
                  <UserMenu />
                ) : (
                  <LoginButton />
                )}
              </>
            )}
          </nav>
        </div>
      </header>

      <GlobalLeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
      />
    </>
  );
}
