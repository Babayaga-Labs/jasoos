'use client';

import Link from 'next/link';
import { LoginButton } from '@/components/auth/LoginButton';
import { UserMenu } from '@/components/auth/UserMenu';
import { useAuth } from '@/components/auth/AuthProvider';

export function Header() {
  const { user, isLoading } = useAuth();

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold">
            <span className="text-amber-400">Jhakaas</span> Jasoos
          </span>
        </Link>

        <nav className="flex items-center gap-4">
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
  );
}
