'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        capture_pageview: true,
        capture_pageleave: true,
        person_profiles: 'always', // Create profiles for all users (needed for recordings)
        // Session recording config
        disable_session_recording: false, // Explicitly enable
        session_recording: {
          maskAllInputs: false,
          maskTextSelector: '[data-ph-mask]',
        },
      });

      // Expose for debugging
      (window as Window & { posthog?: typeof posthog }).posthog = posthog;
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
