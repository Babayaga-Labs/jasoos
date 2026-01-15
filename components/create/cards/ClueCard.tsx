'use client';

import type { UGCGeneratedPlotPoint, UGCGeneratedCharacter } from '@/packages/ai/types/ugc-types';

interface ClueCardProps {
  plotPoint: UGCGeneratedPlotPoint;
  characters: UGCGeneratedCharacter[];
  delay?: number;
  onEdit?: () => void;
}

const IMPORTANCE_COLORS = {
  low: { bg: 'bg-slate-500/20', border: 'border-slate-500/30', text: 'text-slate-300' },
  medium: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-300' },
  high: { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-300' },
  critical: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-300' },
};

const CATEGORY_ICONS = {
  motive: '💡',
  alibi: '⏰',
  evidence: '🔍',
  relationship: '👥',
};

export function ClueCard({ plotPoint, characters, delay = 0, onEdit }: ClueCardProps) {
  const colors = IMPORTANCE_COLORS[plotPoint.importance];
  const icon = CATEGORY_ICONS[plotPoint.category];

  // Get character names for revealedBy
  const revealers = plotPoint.revealedBy
    .map(id => characters.find(c => c.id === id)?.name || id)
    .filter(Boolean);

  return (
    <div
      className="opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className={`
        relative rounded-xl ${colors.bg} border ${colors.border}
        p-4 hover:scale-[1.01] transition-transform group
      `}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            <span className={`text-xs font-medium uppercase tracking-wide ${colors.text}`}>
              {plotPoint.category}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`
              px-2 py-0.5 text-xs font-bold rounded-full
              ${colors.bg} ${colors.text} border ${colors.border}
            `}>
              {plotPoint.importance.toUpperCase()}
            </span>
            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              +{plotPoint.points} pts
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-slate-200 mb-3">{plotPoint.description}</p>

        {/* Revealed by */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">Revealed by:</span>
          <div className="flex flex-wrap gap-1">
            {revealers.map((name, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-xs"
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Detection hints (collapsed) */}
        {plotPoint.detectionHints.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700/30">
            <p className="text-xs text-slate-500">
              Triggers: {plotPoint.detectionHints.slice(0, 3).join(', ')}
              {plotPoint.detectionHints.length > 3 && ` +${plotPoint.detectionHints.length - 3} more`}
            </p>
          </div>
        )}

        {/* Edit button (on hover) */}
        {onEdit && (
          <button
            onClick={onEdit}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:text-white transition-all"
          >
            ✏️
          </button>
        )}
      </div>
    </div>
  );
}

interface ClueSummaryProps {
  plotPoints: UGCGeneratedPlotPoint[];
  minimumPointsToAccuse: number;
  perfectScoreThreshold: number;
  delay?: number;
}

export function ClueSummary({
  plotPoints,
  minimumPointsToAccuse,
  perfectScoreThreshold,
  delay = 0,
}: ClueSummaryProps) {
  const totalPoints = plotPoints.reduce((sum, pp) => sum + pp.points, 0);
  const byCategory = {
    motive: plotPoints.filter(pp => pp.category === 'motive').length,
    alibi: plotPoints.filter(pp => pp.category === 'alibi').length,
    evidence: plotPoints.filter(pp => pp.category === 'evidence').length,
    relationship: plotPoints.filter(pp => pp.category === 'relationship').length,
  };

  return (
    <div
      className="opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🎯</span>
          <h3 className="font-semibold text-white">Mystery Statistics</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 rounded-lg bg-slate-800/30">
            <p className="text-2xl font-bold text-white">{plotPoints.length}</p>
            <p className="text-xs text-slate-400">Total Clues</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-slate-800/30">
            <p className="text-2xl font-bold text-emerald-400">{totalPoints}</p>
            <p className="text-xs text-slate-400">Max Points</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-slate-800/30">
            <p className="text-2xl font-bold text-amber-400">{minimumPointsToAccuse}</p>
            <p className="text-xs text-slate-400">Min to Accuse</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-slate-800/30">
            <p className="text-2xl font-bold text-violet-400">{perfectScoreThreshold}</p>
            <p className="text-xs text-slate-400">Perfect Score</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 justify-center">
          <span className="px-3 py-1.5 rounded-full bg-slate-700/30 text-slate-300 text-sm">
            {CATEGORY_ICONS.motive} {byCategory.motive} motive
          </span>
          <span className="px-3 py-1.5 rounded-full bg-slate-700/30 text-slate-300 text-sm">
            {CATEGORY_ICONS.alibi} {byCategory.alibi} alibi
          </span>
          <span className="px-3 py-1.5 rounded-full bg-slate-700/30 text-slate-300 text-sm">
            {CATEGORY_ICONS.evidence} {byCategory.evidence} evidence
          </span>
          <span className="px-3 py-1.5 rounded-full bg-slate-700/30 text-slate-300 text-sm">
            {CATEGORY_ICONS.relationship} {byCategory.relationship} relationship
          </span>
        </div>
      </div>
    </div>
  );
}
