'use client';

import { useGameStore } from '@/lib/store';

interface NotepadProps {
  premise: string;
}

export function Notepad({ premise }: NotepadProps) {
  const { isNotepadOpen, toggleNotepad, plotPoints, unlockedPlotPoints, currentScore, totalPossiblePoints } = useGameStore();

  if (!isNotepadOpen) return null;

  const unlockedPoints = plotPoints.filter(pp => unlockedPlotPoints.includes(pp.id));

  const categories = {
    evidence: unlockedPoints.filter(pp => pp.category === 'evidence'),
    motive: unlockedPoints.filter(pp => pp.category === 'motive'),
    alibi: unlockedPoints.filter(pp => pp.category === 'alibi'),
    relationship: unlockedPoints.filter(pp => pp.category === 'relationship'),
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={toggleNotepad} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-96 bg-slate-800 border-l border-slate-700 z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-amber-400">📒 Evidence Notepad</h2>
          <button
            onClick={toggleNotepad}
            className="text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Score */}
        <div className="p-4 bg-slate-900/50 border-b border-slate-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Evidence collected:</span>
            <span className="text-amber-400 font-bold">
              {unlockedPlotPoints.length} / {plotPoints.length}
            </span>
          </div>
          <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${(currentScore / totalPossiblePoints) * 100}%` }}
            />
          </div>
          <div className="mt-1 text-right text-xs text-slate-500">
            {currentScore} / {totalPossiblePoints} pts
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Premise */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-400 mb-2">THE CASE</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{premise}</p>
          </div>

          {/* Evidence by category */}
          {Object.entries(categories).map(([category, items]) => (
            items.length > 0 && (
              <div key={category} className="mb-6">
                <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase">
                  {category === 'evidence' && '🔍 Physical Evidence'}
                  {category === 'motive' && '💭 Motives'}
                  {category === 'alibi' && '🕐 Alibis'}
                  {category === 'relationship' && '👥 Relationships'}
                </h3>
                <ul className="space-y-2">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="bg-slate-700/50 rounded-lg p-3 text-sm text-slate-200 border-l-2 border-amber-500"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span>{item.description}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          item.importance === 'critical' ? 'bg-red-500/20 text-red-400' :
                          item.importance === 'high' ? 'bg-amber-500/20 text-amber-400' :
                          item.importance === 'medium' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-slate-600 text-slate-400'
                        }`}>
                          +{item.points}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          ))}

          {unlockedPlotPoints.length === 0 && (
            <div className="text-center text-slate-500 py-8">
              <p>No evidence collected yet.</p>
              <p className="text-sm mt-2">Interrogate suspects to uncover clues.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
