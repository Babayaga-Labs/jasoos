'use client';

import { useState } from 'react';
import type {
  UGCDraftState,
  UGCFormInput,
  EditableSection,
  UGCGeneratedCharacter,
} from '@/packages/ai/types/ugc-types';

interface ReviewEditorProps {
  draft: UGCDraftState;
  formInput: UGCFormInput;
  onDraftUpdate: (draft: UGCDraftState) => void;
  onRegenerate: (section: EditableSection) => void;
  onSaveAndLaunch: () => void;
  onBackToEdit: () => void;
  error: string | null;
}

interface SectionHeaderProps {
  title: string;
  section: EditableSection;
  isRegenerating: boolean;
  onRegenerate: () => void;
}

function SectionHeader({ title, section, isRegenerating, onRegenerate }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-3">
      <h3 className="text-lg font-medium text-white">{title}</h3>
      <button
        type="button"
        onClick={onRegenerate}
        disabled={isRegenerating}
        className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors disabled:opacity-50"
      >
        {isRegenerating ? (
          <>
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Regenerating...
          </>
        ) : (
          <>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Regenerate
          </>
        )}
      </button>
    </div>
  );
}

export function ReviewEditor({
  draft,
  formInput,
  onDraftUpdate,
  onRegenerate,
  onSaveAndLaunch,
  onBackToEdit,
  error,
}: ReviewEditorProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['timeline', 'characters']));

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const isRegenerating = (section: EditableSection) => draft.regeneratingSections.has(section);

  // Update timeline event
  const updateTimelineEvent = (index: number, value: string) => {
    const newEvents = [...draft.story.actualEvents];
    newEvents[index] = value;
    onDraftUpdate({
      ...draft,
      story: { ...draft.story, actualEvents: newEvents },
      editedSections: new Set([...draft.editedSections, 'timeline']),
    });
  };

  // Add timeline event
  const addTimelineEvent = () => {
    onDraftUpdate({
      ...draft,
      story: {
        ...draft.story,
        actualEvents: [...draft.story.actualEvents, ''],
      },
      editedSections: new Set([...draft.editedSections, 'timeline']),
    });
  };

  // Remove timeline event
  const removeTimelineEvent = (index: number) => {
    const newEvents = draft.story.actualEvents.filter((_, i) => i !== index);
    onDraftUpdate({
      ...draft,
      story: { ...draft.story, actualEvents: newEvents },
      editedSections: new Set([...draft.editedSections, 'timeline']),
    });
  };

  // Update character field
  const updateCharacter = (charId: string, field: string, value: string | string[]) => {
    const newCharacters = draft.characters.map(char => {
      if (char.id !== charId) return char;

      if (field === 'alibi') {
        return { ...char, knowledge: { ...char.knowledge, alibi: value as string } };
      }
      if (field === 'knowsAboutCrime') {
        return { ...char, knowledge: { ...char.knowledge, knowsAboutCrime: value as string } };
      }
      if (field === 'knowsAboutOthers') {
        return { ...char, knowledge: { ...char.knowledge, knowsAboutOthers: value as string[] } };
      }
      return char;
    });

    const editSection: EditableSection = field === 'alibi' ? 'characterAlibis' : 'characterKnowledge';
    onDraftUpdate({
      ...draft,
      characters: newCharacters,
      editedSections: new Set([...draft.editedSections, editSection]),
    });
  };

  // Update plot point
  const updatePlotPoint = (ppId: string, field: string, value: string | string[]) => {
    const newPlotPoints = draft.plotPoints.plotPoints.map(pp => {
      if (pp.id !== ppId) return pp;
      if (field === 'description') {
        return { ...pp, description: value as string };
      }
      if (field === 'revealedBy') {
        return { ...pp, revealedBy: value as string[] };
      }
      return pp;
    });

    onDraftUpdate({
      ...draft,
      plotPoints: { ...draft.plotPoints, plotPoints: newPlotPoints },
      editedSections: new Set([...draft.editedSections, 'clues']),
    });
  };

  // Update solution explanation
  const updateSolutionExplanation = (value: string) => {
    onDraftUpdate({
      ...draft,
      story: {
        ...draft.story,
        solution: { ...draft.story.solution, explanation: value },
      },
      editedSections: new Set([...draft.editedSections, 'solution']),
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Story Summary */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <h2 className="text-xl font-semibold text-amber-400 mb-2">{draft.story.title}</h2>
        <p className="text-slate-300 text-sm">{draft.story.premise}</p>
        <div className="mt-2 flex gap-4 text-xs text-slate-500">
          <span>Setting: {draft.story.setting.location}</span>
          <span>Difficulty: {draft.story.difficulty}</span>
          <span>~{draft.story.estimatedMinutes} min</span>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
        <button
          type="button"
          onClick={() => toggleSection('timeline')}
          className="w-full flex items-center justify-between text-left"
        >
          <span className="text-lg font-medium text-white">Timeline of Events</span>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.has('timeline') ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expandedSections.has('timeline') && (
          <div className="mt-4">
            <SectionHeader
              title=""
              section="timeline"
              isRegenerating={isRegenerating('timeline')}
              onRegenerate={() => onRegenerate('timeline')}
            />
            <div className="space-y-2">
              {draft.story.actualEvents.map((event, index) => (
                <div key={index} className="flex gap-2">
                  <span className="text-slate-500 text-sm w-6 flex-shrink-0">{index + 1}.</span>
                  <input
                    type="text"
                    value={event}
                    onChange={(e) => updateTimelineEvent(index, e.target.value)}
                    className="flex-1 px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeTimelineEvent(index)}
                    className="text-slate-500 hover:text-red-400"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addTimelineEvent}
                className="text-sm text-amber-400 hover:text-amber-300"
              >
                + Add event
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Characters Section */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
        <button
          type="button"
          onClick={() => toggleSection('characters')}
          className="w-full flex items-center justify-between text-left"
        >
          <span className="text-lg font-medium text-white">Character Details</span>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.has('characters') ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expandedSections.has('characters') && (
          <div className="mt-4 space-y-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onRegenerate('characterKnowledge')}
                disabled={isRegenerating('characterKnowledge')}
                className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-50"
              >
                {isRegenerating('characterKnowledge') ? 'Regenerating...' : 'Regenerate Knowledge'}
              </button>
              <button
                type="button"
                onClick={() => onRegenerate('characterAlibis')}
                disabled={isRegenerating('characterAlibis')}
                className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-50"
              >
                {isRegenerating('characterAlibis') ? 'Regenerating...' : 'Regenerate Alibis'}
              </button>
              <button
                type="button"
                onClick={() => onRegenerate('relationships')}
                disabled={isRegenerating('relationships')}
                className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 disabled:opacity-50"
              >
                {isRegenerating('relationships') ? 'Regenerating...' : 'Regenerate Relationships'}
              </button>
            </div>

            {draft.characters.map((char) => (
              <CharacterDetailCard
                key={char.id}
                character={char}
                allCharacters={draft.characters}
                onUpdate={updateCharacter}
              />
            ))}
          </div>
        )}
      </div>

      {/* Clues Section */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
        <button
          type="button"
          onClick={() => toggleSection('clues')}
          className="w-full flex items-center justify-between text-left"
        >
          <span className="text-lg font-medium text-white">Clues & Evidence ({draft.plotPoints.plotPoints.length})</span>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.has('clues') ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expandedSections.has('clues') && (
          <div className="mt-4">
            <SectionHeader
              title=""
              section="clues"
              isRegenerating={isRegenerating('clues')}
              onRegenerate={() => onRegenerate('clues')}
            />
            <div className="space-y-3">
              {draft.plotPoints.plotPoints.map((pp) => (
                <div key={pp.id} className="bg-slate-900/50 border border-slate-700 rounded p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      pp.importance === 'critical' ? 'bg-red-500/30 text-red-400' :
                      pp.importance === 'high' ? 'bg-amber-500/30 text-amber-400' :
                      pp.importance === 'medium' ? 'bg-blue-500/30 text-blue-400' :
                      'bg-slate-500/30 text-slate-400'
                    }`}>
                      {pp.importance}
                    </span>
                    <span className="text-xs text-slate-500">{pp.category}</span>
                    <span className="text-xs text-slate-500">({pp.points} pts)</span>
                  </div>
                  <textarea
                    value={pp.description}
                    onChange={(e) => updatePlotPoint(pp.id, 'description', e.target.value)}
                    rows={2}
                    className="w-full px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    Revealed by: {pp.revealedBy.map(id => {
                      const char = draft.characters.find(c => c.id === id);
                      return char?.name || id;
                    }).join(', ')}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Points to accuse: {draft.plotPoints.minimumPointsToAccuse} | Perfect score: {draft.plotPoints.perfectScoreThreshold}
            </div>
          </div>
        )}
      </div>

      {/* Solution Section */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
        <button
          type="button"
          onClick={() => toggleSection('solution')}
          className="w-full flex items-center justify-between text-left"
        >
          <span className="text-lg font-medium text-white">Solution</span>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.has('solution') ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expandedSections.has('solution') && (
          <div className="mt-4">
            <SectionHeader
              title=""
              section="solution"
              isRegenerating={isRegenerating('solution')}
              onRegenerate={() => onRegenerate('solution')}
            />
            <div className="space-y-3">
              <div>
                <span className="text-xs text-slate-500">Culprit:</span>
                <p className="text-white">{draft.story.solution.culprit}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Motive:</span>
                <p className="text-slate-300 text-sm">{draft.story.solution.motive}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Method:</span>
                <p className="text-slate-300 text-sm">{draft.story.solution.method}</p>
              </div>
              <div>
                <label className="text-xs text-slate-500 block mb-1">Explanation (shown to player):</label>
                <textarea
                  value={draft.story.solution.explanation}
                  onChange={(e) => updateSolutionExplanation(e.target.value)}
                  rows={4}
                  className="w-full px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={onBackToEdit}
          className="flex-1 py-3 text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-800 transition-colors"
        >
          Back to Edit
        </button>
        <button
          type="button"
          onClick={onSaveAndLaunch}
          className="flex-1 btn btn-primary py-3 text-lg font-medium"
        >
          Finalize & Play
        </button>
      </div>
    </div>
  );
}

// Character Detail Card Component
interface CharacterDetailCardProps {
  character: UGCGeneratedCharacter;
  allCharacters: UGCGeneratedCharacter[];
  onUpdate: (charId: string, field: string, value: string | string[]) => void;
}

function CharacterDetailCard({ character, allCharacters, onUpdate }: CharacterDetailCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-slate-900/50 border border-slate-700 rounded p-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <span className="text-white font-medium">{character.name}</span>
          <span className="text-slate-500 text-sm ml-2">({character.role})</span>
          {character.isGuilty && <span className="text-red-400 text-xs ml-2">[GUILTY]</span>}
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 pt-3 border-t border-slate-700">
          {/* Alibi */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">Alibi:</label>
            <textarea
              value={character.knowledge.alibi}
              onChange={(e) => onUpdate(character.id, 'alibi', e.target.value)}
              rows={2}
              className="w-full px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
            />
          </div>

          {/* What they know about the crime */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">Knows about the crime:</label>
            <textarea
              value={character.knowledge.knowsAboutCrime}
              onChange={(e) => onUpdate(character.id, 'knowsAboutCrime', e.target.value)}
              rows={2}
              className="w-full px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
            />
          </div>

          {/* What they know about others */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">Knows about other characters:</label>
            <div className="space-y-1">
              {character.knowledge.knowsAboutOthers.map((info, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={info}
                  onChange={(e) => {
                    const newKnowledge = [...character.knowledge.knowsAboutOthers];
                    newKnowledge[idx] = e.target.value;
                    onUpdate(character.id, 'knowsAboutOthers', newKnowledge);
                  }}
                  className="w-full px-2 py-1 text-sm bg-slate-900 border border-slate-700 rounded text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              ))}
            </div>
          </div>

          {/* Relationships */}
          <div>
            <label className="text-xs text-slate-500 block mb-1">Relationships:</label>
            <div className="space-y-1 text-sm text-slate-400">
              {Object.entries(character.relationships).map(([otherId, relation]) => {
                const otherChar = allCharacters.find(c => c.id === otherId);
                return (
                  <div key={otherId}>
                    <span className="text-slate-500">{otherChar?.name || otherId}:</span>{' '}
                    <span>{relation}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
