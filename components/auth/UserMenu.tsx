'use client';

import { useState, useEffect, useRef } from 'react';
import { signOut, onAuthStateChange, getUser } from '@/lib/supabase/auth';
import type { User } from '@supabase/supabase-js';

export function UserMenu() {
  const [user, setUser] = useState<User | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get initial user
    getUser().then((user) => {
      setUser(user);
      setIsLoading(false);
    });

    // Subscribe to auth changes
    const unsubscribe = onAuthStateChange((user) => {
      setUser(user);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="w-10 h-10 rounded-full bg-slate-700 animate-pulse" />
    );
  }

  if (!user) {
    return null;
  }

  const avatarUrl = user.user_metadata?.avatar_url;
  const name = user.user_metadata?.full_name || user.email;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-10 h-10 rounded-full border-2 border-rose-400"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-rose-400 flex items-center justify-center text-slate-900 font-bold">
            {name?.charAt(0).toUpperCase()}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-800 rounded-lg shadow-lg border border-slate-700 py-2 z-50">
          <div className="px-4 py-2 border-b border-slate-700">
            <p className="text-sm font-medium text-white truncate">{name}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
