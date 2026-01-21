import { createClient } from './client';
import type { User } from '@supabase/supabase-js';

/**
 * Get the site origin for redirects
 * Uses NEXT_PUBLIC_SITE_URL in production, falls back to window.location.origin
 */
export function getSiteOrigin(): string {
  // Use configured site URL if available (recommended for production)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  // Fallback to current origin
  return window.location.origin;
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(redirectTo?: string) {
  const supabase = createClient();
  const origin = getSiteOrigin();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo || `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error('Sign in error:', error);
    throw error;
  }

  return data;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

/**
 * Get the current user (client-side)
 */
export async function getUser(): Promise<User | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get the current session (client-side)
 */
export async function getSession() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
  const supabase = createClient();

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      callback(session?.user || null);
    }
  );

  return () => subscription.unsubscribe();
}
