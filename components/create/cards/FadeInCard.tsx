'use client';

import { ReactNode } from 'react';

interface FadeInCardProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function FadeInCard({ children, delay = 0, className = '' }: FadeInCardProps) {
  return (
    <div
      className={`opacity-0 animate-fade-in-up ${className}`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      {children}
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className = '' }: SkeletonCardProps) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl
        bg-gradient-to-br from-slate-800/50 to-slate-900/50
        border border-slate-700/30
        ${className}
      `}
    >
      {/* Shimmer effect */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700/20 to-transparent animate-shimmer"
        style={{ backgroundSize: '200% 100%' }}
      />

      {/* Content skeleton */}
      <div className="p-6 space-y-4">
        <div className="h-6 w-1/3 bg-slate-700/50 rounded" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-slate-700/30 rounded" />
          <div className="h-4 w-4/5 bg-slate-700/30 rounded" />
          <div className="h-4 w-2/3 bg-slate-700/30 rounded" />
        </div>
      </div>
    </div>
  );
}
