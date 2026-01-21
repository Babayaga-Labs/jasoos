'use client';

import { useWizard } from '../wizard/WizardContext';
import type { FleshOutRequest } from '@/packages/ai/types/ugc-types';

export function FoundationStage() {
  const { state, dispatch, canProceedFromFoundation } = useWizard();
  const { foundation, foundationCharacters, culpritId, culpritMotive, culpritMethod } = state;

  if (!foundation) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">No foundation generated yet. Go back to enter your idea.</p>
        <button
          onClick={() => dispatch({ type: 'GO_TO_STAGE', stage: 'prompt' })}
          className="mt-4 px-6 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
        >
          Go to Prompt
        </button>
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!canProceedFromFoundation || !culpritId) return;

    dispatch({ type: 'START_GENERATION' });

    try {
      const request: FleshOutRequest = {
        foundation,
        characters: foundationCharacters,
        culprit: {
          characterId: culpritId,
          motive: culpritMotive,
          method: culpritMethod,
        },
      };

      const response = await fetch('/api/ugc/flesh-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate');
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'progress') {
              dispatch({
                type: 'UPDATE_GENERATION_PROGRESS',
                step: data.message,
                progress: data.progress,
              });
            } else if (data.type === 'complete') {
              dispatch({ type: 'COMPLETE_GENERATION', result: data.result });
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          }
        }
      }
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        error: error instanceof Error ? error.message : 'Failed to generate',
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-3">
          Your Mystery Foundation
        </h2>
        <p className="text-slate-400">
          Review and customize the foundation of your mystery. Mark one character as the culprit.
        </p>
      </div>

      {/* Title & Synopsis */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Title</label>
          <input
            type="text"
            value={foundation.title}
            onChange={(e) => dispatch({ type: 'UPDATE_FOUNDATION_FIELD', field: 'title', value: e.target.value })}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">Synopsis</label>
          <textarea
            value={foundation.synopsis}
            onChange={(e) => dispatch({ type: 'UPDATE_FOUNDATION_FIELD', field: 'synopsis', value: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          />
        </div>
      </div>

      {/* Setting Tags */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Setting</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Location</label>
            <input
              type="text"
              value={foundation.setting.location}
              onChange={(e) => dispatch({ type: 'UPDATE_FOUNDATION_SETTING', field: 'location', value: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Time Period</label>
            <input
              type="text"
              value={foundation.setting.timePeriod}
              onChange={(e) => dispatch({ type: 'UPDATE_FOUNDATION_SETTING', field: 'timePeriod', value: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Crime Type</label>
            <select
              value={foundation.crimeType}
              onChange={(e) => dispatch({ type: 'UPDATE_FOUNDATION_FIELD', field: 'crimeType', value: e.target.value })}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="murder">Murder</option>
              <option value="theft">Theft</option>
              <option value="kidnapping">Kidnapping</option>
              <option value="fraud">Fraud</option>
              <option value="sabotage">Sabotage</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Victim */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">The Victim</h3>
        <textarea
          value={foundation.victimParagraph}
          onChange={(e) => dispatch({ type: 'UPDATE_FOUNDATION_FIELD', field: 'victimParagraph', value: e.target.value })}
          rows={3}
          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          placeholder="Describe the victim and what happened to them..."
        />
      </div>

      {/* Characters */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Characters</h3>
          <button
            onClick={() => dispatch({ type: 'ADD_FOUNDATION_CHARACTER' })}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm"
          >
            + Add Character
          </button>
        </div>

        <div className="space-y-4">
          {foundationCharacters.map((char) => (
            <CharacterCard
              key={char.id}
              character={char}
              isCulprit={char.id === culpritId}
              motive={char.id === culpritId ? culpritMotive : ''}
              method={char.id === culpritId ? culpritMethod : ''}
              onUpdate={(field, value) =>
                dispatch({ type: 'UPDATE_FOUNDATION_CHARACTER', id: char.id, field, value })
              }
              onSetCulprit={() => dispatch({ type: 'SET_CULPRIT', id: char.id === culpritId ? null : char.id })}
              onMotiveChange={(motive) => dispatch({ type: 'SET_CULPRIT_MOTIVE', motive })}
              onMethodChange={(method) => dispatch({ type: 'SET_CULPRIT_METHOD', method })}
              onDelete={() => dispatch({ type: 'DELETE_FOUNDATION_CHARACTER', id: char.id })}
              canDelete={foundationCharacters.length > 3}
            />
          ))}
        </div>

        {foundationCharacters.length < 3 && (
          <p className="mt-4 text-sm text-amber-400">
            You need at least 3 characters. Add {3 - foundationCharacters.length} more.
          </p>
        )}
      </div>

      {/* Validation Messages */}
      {!canProceedFromFoundation && (
        <div className="bg-amber-900/30 border border-amber-500/30 rounded-xl p-4">
          <p className="text-amber-400 font-medium">Before you continue:</p>
          <ul className="mt-2 text-sm text-amber-300 space-y-1">
            {foundationCharacters.length < 3 && (
              <li>- Add at least 3 characters</li>
            )}
            {foundationCharacters.some((c) => !c.name.trim()) && (
              <li>- Fill in all character names</li>
            )}
            {!culpritId && <li>- Select the culprit</li>}
            {culpritId && !culpritMotive.trim() && <li>- Provide the culprit&apos;s motive</li>}
            {culpritId && !culpritMethod.trim() && <li>- Provide the culprit&apos;s method</li>}
          </ul>
        </div>
      )}

      {/* Generate Button */}
      <div className="flex justify-between items-center pt-4">
        <button
          onClick={() => dispatch({ type: 'GO_TO_STAGE', stage: 'prompt' })}
          className="px-6 py-3 text-slate-400 hover:text-white transition-colors"
        >
          ← Back to Prompt
        </button>

        <button
          onClick={handleGenerate}
          disabled={!canProceedFromFoundation || state.charactersGenerating}
          className={`
            py-4 px-8 rounded-xl font-semibold text-lg transition-all duration-300
            ${canProceedFromFoundation && !state.charactersGenerating
              ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 hover:scale-[1.02]'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }
          `}
        >
          Give Life to Your Characters
        </button>
      </div>
    </div>
  );
}

interface CharacterCardProps {
  character: { id: string; name: string; role: string; connectionHint: string };
  isCulprit: boolean;
  motive: string;
  method: string;
  onUpdate: (field: 'name' | 'role' | 'connectionHint', value: string) => void;
  onSetCulprit: () => void;
  onMotiveChange: (motive: string) => void;
  onMethodChange: (method: string) => void;
  onDelete: () => void;
  canDelete: boolean;
}

function CharacterCard({
  character,
  isCulprit,
  motive,
  method,
  onUpdate,
  onSetCulprit,
  onMotiveChange,
  onMethodChange,
  onDelete,
  canDelete,
}: CharacterCardProps) {
  return (
    <div
      className={`
        p-4 rounded-xl border transition-all duration-300
        ${isCulprit
          ? 'bg-red-900/20 border-red-500/50'
          : 'bg-slate-900/50 border-slate-600'
        }
      `}
    >
      <div className="flex items-start gap-4">
        {/* Character Info */}
        <div className="flex-1 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">Name</label>
              <input
                type="text"
                value={character.name}
                onChange={(e) => onUpdate('name', e.target.value)}
                placeholder="Character name"
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div className="w-40">
              <label className="block text-xs text-slate-400 mb-1">Role</label>
              <input
                type="text"
                value={character.role}
                onChange={(e) => onUpdate('role', e.target.value)}
                placeholder="e.g., Butler, Heir"
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Connection to Crime</label>
            <input
              type="text"
              value={character.connectionHint}
              onChange={(e) => onUpdate('connectionHint', e.target.value)}
              placeholder="How are they connected to the crime?"
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Culprit Details (expanded when culprit) */}
          {isCulprit && (
            <div className="mt-4 pt-4 border-t border-red-500/30 space-y-3">
              <p className="text-sm font-medium text-red-400">Culprit Details</p>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Motive</label>
                <input
                  type="text"
                  value={motive}
                  onChange={(e) => onMotiveChange(e.target.value)}
                  placeholder="Why did they do it?"
                  className="w-full px-3 py-2 bg-slate-800/50 border border-red-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Method</label>
                <input
                  type="text"
                  value={method}
                  onChange={(e) => onMethodChange(e.target.value)}
                  placeholder="How did they do it?"
                  className="w-full px-3 py-2 bg-slate-800/50 border border-red-500/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onSetCulprit}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-all
              ${isCulprit
                ? 'bg-red-500 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-red-500/20 hover:text-red-400'
              }
            `}
          >
            {isCulprit ? 'Culprit' : 'Mark Culprit'}
          </button>
          {canDelete && (
            <button
              onClick={onDelete}
              className="px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
