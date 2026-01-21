'use client';

import { useState } from 'react';

interface StoryElementCardProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  onEdit?: () => void;
  onRegenerate?: () => void;
  isEditing?: boolean;
  editContent?: React.ReactNode;
  delay?: number;
}

export function StoryElementCard({
  title,
  icon,
  children,
  onEdit,
  onRegenerate,
  isEditing,
  editContent,
  delay = 0,
}: StoryElementCardProps) {
  return (
    <div
      className="opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="relative group rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40 backdrop-blur-sm overflow-hidden hover:border-violet-500/30 transition-colors">
        {/* Gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-violet-500 opacity-60" />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{icon}</span>
              <h3 className="font-semibold text-white">{title}</h3>
            </div>

            {/* Actions */}
            {(onEdit || onRegenerate) && (
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white transition-colors"
                  >
                    {isEditing ? 'Done' : 'Edit'}
                  </button>
                )}
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-600/30 text-violet-300 hover:bg-violet-500/40 hover:text-white transition-colors"
                  >
                    Regenerate
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="text-slate-300">
            {isEditing ? editContent : children}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TimelineCardProps {
  events: string[];
  delay?: number;
}

export function TimelineCard({ events, delay = 0 }: TimelineCardProps) {
  return (
    <div
      className="opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40 backdrop-blur-sm overflow-hidden">
        {/* Gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-violet-500 opacity-60" />

        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⏰</span>
            <h3 className="font-semibold text-white">Timeline of Events</h3>
          </div>

          <div className="relative pl-6">
            {/* Timeline line */}
            <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-violet-500/50" />

            <div className="space-y-3">
              {events.map((event, index) => (
                <div
                  key={index}
                  className="relative flex items-start gap-3 opacity-0 animate-fade-in"
                  style={{
                    animationDelay: `${delay + 100 + index * 80}ms`,
                    animationFillMode: 'forwards',
                  }}
                >
                  {/* Timeline dot */}
                  <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-violet-500 border-2 border-slate-900" />

                  <p className="text-slate-300 text-sm leading-relaxed">{event}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
