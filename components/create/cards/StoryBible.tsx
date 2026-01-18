'use client';

import { useState } from 'react';
import { useWizard } from '../wizard/WizardContext';
import type { UGCGeneratedCharacter } from '@/packages/ai/types/ugc-types';
import type { ValidationWarning } from '@/packages/ai';

interface StoryBibleProps {
  validationWarnings?: ValidationWarning[] | null;
}

// ============================================================================
// Timeline Section (Exported for tabbed view)
// ============================================================================

export function TimelineSection() {
  const { state, dispatch } = useWizard();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newEventValue, setNewEventValue] = useState('');
  const [addAfterIndex, setAddAfterIndex] = useState<number>(-1);

  const timeline = state.generatedStory?.actualEvents || [];

  const handleStartEdit = (index: number, value: string) => {
    setEditingIndex(index);
    setEditValue(value);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editValue.trim()) {
      dispatch({ type: 'UPDATE_TIMELINE_EVENT_AT', index: editingIndex, value: editValue.trim() });
    }
    setEditingIndex(null);
    setEditValue('');
  };

  const handleDelete = (index: number) => {
    if (timeline.length > 3) {
      dispatch({ type: 'DELETE_TIMELINE_EVENT_AT', index });
    }
  };

  const handleStartAdd = (afterIndex: number) => {
    setIsAdding(true);
    setAddAfterIndex(afterIndex);
    setNewEventValue('');
  };

  const handleSaveAdd = () => {
    if (newEventValue.trim()) {
      dispatch({ type: 'ADD_TIMELINE_EVENT_AT', index: addAfterIndex, value: newEventValue.trim() });
    }
    setIsAdding(false);
    setNewEventValue('');
    setAddAfterIndex(-1);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-xl">📅</span>
          Timeline of Events
        </h3>
        <span className="text-xs text-slate-500">{timeline.length} events</span>
      </div>

      <p className="text-sm text-slate-400">
        The actual sequence of events. Each character&apos;s knowledge is derived from where they appear here.
      </p>

      <div className="space-y-2">
        {timeline.map((event, index) => (
          <div key={index}>
            {editingIndex === index ? (
              <div className="p-3 rounded-lg bg-slate-800/50 border border-violet-500/50">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-600 text-white text-sm focus:border-violet-500 focus:outline-none resize-none"
                  rows={2}
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSaveEdit}
                    className="px-3 py-1 rounded-lg bg-violet-500 text-white text-sm hover:bg-violet-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingIndex(null)}
                    className="px-3 py-1 rounded-lg bg-slate-700 text-slate-300 text-sm hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="group flex items-start gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/30 hover:border-slate-600/50 transition-all">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-700/50 flex items-center justify-center text-xs text-slate-400 font-mono">
                  {index + 1}
                </span>
                <p className="flex-1 text-sm text-slate-300">{event}</p>
                <div className="flex-shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleStartEdit(index, event)}
                    className="p-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-600"
                    title="Edit"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleStartAdd(index)}
                    className="p-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:text-green-400 hover:bg-slate-600"
                    title="Add event after"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  {timeline.length > 3 && (
                    <button
                      onClick={() => handleDelete(index)}
                      className="p-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:text-red-400 hover:bg-slate-600"
                      title="Delete"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Add new event form */}
            {isAdding && addAfterIndex === index && (
              <div className="ml-9 mt-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <textarea
                  value={newEventValue}
                  onChange={(e) => setNewEventValue(e.target.value)}
                  placeholder="e.g., 8:45 PM - Character name does something..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-600 text-white text-sm placeholder-slate-500 focus:border-green-500 focus:outline-none resize-none"
                  rows={2}
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSaveAdd}
                    disabled={!newEventValue.trim()}
                    className="px-3 py-1 rounded-lg bg-green-500 text-white text-sm hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Event
                  </button>
                  <button
                    onClick={() => setIsAdding(false)}
                    className="px-3 py-1 rounded-lg bg-slate-700 text-slate-300 text-sm hover:bg-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add at beginning button */}
      {!isAdding && timeline.length > 0 && (
        <button
          onClick={() => handleStartAdd(-1)}
          className="w-full p-2 rounded-lg border border-dashed border-slate-600 text-slate-500 text-sm hover:border-slate-500 hover:text-slate-400 transition-all"
        >
          + Add event at beginning
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Character Knowledge Panel (Exported for tabbed view)
// ============================================================================

export function CharacterKnowledgePanel({ character }: { character: UGCGeneratedCharacter }) {
  const { dispatch } = useWizard();
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isAddingKnowledge, setIsAddingKnowledge] = useState(false);
  const [newKnowledgeValue, setNewKnowledgeValue] = useState('');

  const handleStartEdit = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const handleSaveEdit = (field: 'knowsAboutCrime' | 'alibi') => {
    dispatch({ type: 'UPDATE_CHARACTER_KNOWLEDGE', characterId: character.id, field, value: editValue.trim() });
    setEditingField(null);
    setEditValue('');
  };

  const handleEditKnowsAboutOthers = (index: number, value: string) => {
    dispatch({ type: 'UPDATE_CHARACTER_KNOWS_ABOUT_OTHERS', characterId: character.id, index, value });
  };

  const handleDeleteKnowsAboutOthers = (index: number) => {
    dispatch({ type: 'DELETE_CHARACTER_KNOWS_ABOUT_OTHERS', characterId: character.id, index });
  };

  const handleAddKnowsAboutOthers = () => {
    if (newKnowledgeValue.trim()) {
      dispatch({ type: 'ADD_CHARACTER_KNOWS_ABOUT_OTHERS', characterId: character.id, value: newKnowledgeValue.trim() });
      setNewKnowledgeValue('');
      setIsAddingKnowledge(false);
    }
  };

  return (
    <div className="rounded-xl bg-slate-800/30 border border-slate-700/30 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-slate-800/50 transition-all"
      >
        <div className="w-10 h-10 rounded-full bg-slate-700/50 flex items-center justify-center overflow-hidden flex-shrink-0">
          {character.imageUrl ? (
            <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg">👤</span>
          )}
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white">{character.name}</span>
            {character.isGuilty && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold">
                GUILTY
              </span>
            )}
          </div>
          <span className="text-sm text-slate-400">{character.role}</span>
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-700/30">
          {/* What they know about the crime */}
          <div className="pt-4">
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              What They Know About The Crime
            </label>
            {editingField === 'knowsAboutCrime' ? (
              <div className="space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-violet-500 text-white text-sm focus:outline-none resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit('knowsAboutCrime')}
                    className="px-3 py-1 rounded-lg bg-violet-500 text-white text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingField(null)}
                    className="px-3 py-1 rounded-lg bg-slate-700 text-slate-300 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => handleStartEdit('knowsAboutCrime', character.knowledge.knowsAboutCrime)}
                className="p-3 rounded-lg bg-slate-900/30 border border-slate-700/50 text-sm text-slate-300 cursor-pointer hover:border-slate-600 transition-all"
              >
                {character.knowledge.knowsAboutCrime || <span className="text-slate-500 italic">No knowledge defined</span>}
              </div>
            )}
          </div>

          {/* Alibi */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              Alibi
              {character.isGuilty && <span className="ml-2 text-red-400">(Should have holes!)</span>}
            </label>
            {editingField === 'alibi' ? (
              <div className="space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-violet-500 text-white text-sm focus:outline-none resize-none"
                  rows={2}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit('alibi')}
                    className="px-3 py-1 rounded-lg bg-violet-500 text-white text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingField(null)}
                    className="px-3 py-1 rounded-lg bg-slate-700 text-slate-300 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => handleStartEdit('alibi', character.knowledge.alibi)}
                className={`p-3 rounded-lg border text-sm cursor-pointer transition-all ${
                  character.isGuilty
                    ? 'bg-red-500/10 border-red-500/30 text-red-200 hover:border-red-500/50'
                    : 'bg-slate-900/30 border-slate-700/50 text-slate-300 hover:border-slate-600'
                }`}
              >
                {character.knowledge.alibi || <span className="text-slate-500 italic">No alibi defined</span>}
              </div>
            )}
          </div>

          {/* What they know about others */}
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              What They Know About Others
            </label>
            <div className="space-y-2">
              {character.knowledge.knowsAboutOthers.map((knowledge, index) => (
                <div key={index} className="group flex items-start gap-2">
                  <input
                    type="text"
                    value={knowledge}
                    onChange={(e) => handleEditKnowsAboutOthers(index, e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-900/30 border border-slate-700/50 text-sm text-slate-300 focus:border-violet-500 focus:outline-none"
                  />
                  <button
                    onClick={() => handleDeleteKnowsAboutOthers(index)}
                    className="p-2 rounded-lg bg-slate-800/50 text-slate-500 hover:text-red-400 hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              {isAddingKnowledge ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newKnowledgeValue}
                    onChange={(e) => setNewKnowledgeValue(e.target.value)}
                    placeholder="e.g., Saw James near the study at 8pm"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900/30 border border-green-500/50 text-sm text-white placeholder-slate-500 focus:outline-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddKnowsAboutOthers}
                      disabled={!newKnowledgeValue.trim()}
                      className="px-3 py-1 rounded-lg bg-green-500 text-white text-sm disabled:opacity-50"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setIsAddingKnowledge(false)}
                      className="px-3 py-1 rounded-lg bg-slate-700 text-slate-300 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingKnowledge(true)}
                  className="w-full p-2 rounded-lg border border-dashed border-slate-600 text-slate-500 text-sm hover:border-slate-500 hover:text-slate-400 transition-all"
                >
                  + Add knowledge
                </button>
              )}
            </div>
          </div>

          {/* Secrets (read-only reminder) */}
          {character.secrets.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
                Secrets (from character setup)
              </label>
              <div className="space-y-2">
                {character.secrets.map((secret, index) => (
                  <div key={index} className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
                    <p className="text-amber-200">{secret.content}</p>
                    <p className="text-xs text-amber-400/70 mt-1">
                      Willingness: {secret.willingnessToReveal} | Condition: {secret.revealCondition}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Character Knowledge Section (Exported wrapper for all characters)
// ============================================================================

export function CharacterKnowledgeSection() {
  const { completedCharacters } = useWizard();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="text-xl">👥</span>
          Character Knowledge
        </h3>
        <span className="text-xs text-slate-500">{completedCharacters.length} characters</span>
      </div>
      <p className="text-sm text-slate-400">
        What each character knows for roleplay. Click to expand and edit.
      </p>
      <div className="space-y-2">
        {completedCharacters.map((character) => (
          <CharacterKnowledgePanel key={character.id} character={character} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Solution Section
// ============================================================================

export function SolutionSection() {
  const { state, dispatch } = useWizard();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const solution = state.generatedStory?.solution;

  if (!solution) return null;

  const handleStartEdit = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const handleSaveEdit = (field: 'culprit' | 'method' | 'motive' | 'explanation') => {
    dispatch({ type: 'UPDATE_SOLUTION', field, value: editValue.trim() });
    setEditingField(null);
    setEditValue('');
  };

  const fields: { key: 'culprit' | 'method' | 'motive' | 'explanation'; label: string; rows: number }[] = [
    { key: 'culprit', label: 'Culprit', rows: 1 },
    { key: 'motive', label: 'Motive', rows: 2 },
    { key: 'method', label: 'Method', rows: 2 },
    { key: 'explanation', label: 'Full Explanation', rows: 4 },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <span className="text-xl">🔍</span>
        Solution
      </h3>

      <p className="text-sm text-slate-400">
        The truth of what happened. This is revealed when the player correctly accuses the culprit.
      </p>

      <div className="space-y-3">
        {fields.map(({ key, label, rows }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              {label}
            </label>
            {editingField === key ? (
              <div className="space-y-2">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-violet-500 text-white text-sm focus:outline-none resize-none"
                  rows={rows}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit(key)}
                    className="px-3 py-1 rounded-lg bg-violet-500 text-white text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingField(null)}
                    className="px-3 py-1 rounded-lg bg-slate-700 text-slate-300 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => handleStartEdit(key, solution[key])}
                className="p-3 rounded-lg bg-slate-900/30 border border-slate-700/50 text-sm text-slate-300 cursor-pointer hover:border-slate-600 transition-all"
              >
                {solution[key] || <span className="text-slate-500 italic">Not defined</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Story Bible Component
// ============================================================================

type BibleSection = 'timeline' | 'characters' | 'solution';

export function StoryBible({ validationWarnings }: StoryBibleProps) {
  const { state, completedCharacters } = useWizard();
  const [expandedSections, setExpandedSections] = useState<Set<BibleSection>>(new Set(['timeline', 'characters']));

  const toggleSection = (section: BibleSection) => {
    const newSections = new Set(expandedSections);
    if (newSections.has(section)) {
      newSections.delete(section);
    } else {
      newSections.add(section);
    }
    setExpandedSections(newSections);
  };

  const sections: { id: BibleSection; title: string; icon: string; count?: number }[] = [
    { id: 'timeline', title: 'Timeline of Events', icon: '📅', count: state.generatedStory?.actualEvents.length },
    { id: 'characters', title: 'Character Knowledge', icon: '👥', count: completedCharacters.length },
    { id: 'solution', title: 'Solution', icon: '🔍' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="text-2xl">📖</span>
          Story Bible
        </h2>
        <p className="text-sm text-slate-400">
          Review and edit everything before publishing
        </p>
      </div>

      {/* Section toggles */}
      <div className="flex flex-wrap gap-2">
        {sections.map(({ id, title, icon, count }) => (
          <button
            key={id}
            onClick={() => toggleSection(id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
              expandedSections.has(id)
                ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                : 'bg-slate-800/50 text-slate-400 border border-slate-700/30 hover:border-slate-600'
            }`}
          >
            <span>{icon}</span>
            <span>{title}</span>
            {count !== undefined && (
              <span className="px-1.5 py-0.5 rounded-full bg-slate-700/50 text-xs">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Expanded sections */}
      <div className="space-y-6">
        {expandedSections.has('timeline') && (
          <div className="p-4 rounded-xl bg-slate-800/20 border border-slate-700/30">
            <TimelineSection />
          </div>
        )}

        {expandedSections.has('characters') && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="text-xl">👥</span>
              Character Knowledge
              <span className="text-sm text-slate-500 font-normal">
                (What each character knows for roleplay)
              </span>
            </h3>
            <div className="space-y-2">
              {completedCharacters.map((character) => (
                <CharacterKnowledgePanel key={character.id} character={character} />
              ))}
            </div>
          </div>
        )}

        {expandedSections.has('solution') && (
          <div className="p-4 rounded-xl bg-slate-800/20 border border-slate-700/30">
            <SolutionSection />
          </div>
        )}

      </div>

      {/* Warnings section */}
      <WarningsSection validationWarnings={validationWarnings} />
    </div>
  );
}

// ============================================================================
// Warnings Section - Flag potential issues
// ============================================================================

interface WarningSectionProps {
  validationWarnings?: ValidationWarning[] | null;
}

function WarningsSection({ validationWarnings }: WarningSectionProps) {
  const { state, completedCharacters } = useWizard();
  const localWarnings: { type: 'error' | 'warning'; message: string }[] = [];

  // Check for characters with empty knowledge (basic local checks)
  completedCharacters.forEach((char) => {
    if (!char.knowledge.knowsAboutCrime) {
      localWarnings.push({
        type: 'warning',
        message: `${char.name} has no "knowsAboutCrime" - they may feel hollow in roleplay`,
      });
    }
    if (!char.knowledge.alibi) {
      localWarnings.push({
        type: 'warning',
        message: `${char.name} has no alibi defined`,
      });
    }
    if (char.knowledge.knowsAboutOthers.length === 0) {
      localWarnings.push({
        type: 'warning',
        message: `${char.name} knows nothing about other characters`,
      });
    }
  });

  // Check if guilty character's alibi seems too solid
  const guiltyChar = completedCharacters.find((c) => c.isGuilty);
  if (guiltyChar && guiltyChar.knowledge.alibi && !guiltyChar.knowledge.alibi.toLowerCase().includes('claim')) {
    localWarnings.push({
      type: 'warning',
      message: `${guiltyChar.name}'s alibi may be too solid - it should have holes players can discover`,
    });
  }

  // Check clues are assigned to characters who know them
  state.generatedPlotPoints?.forEach((clue) => {
    if (clue.revealedBy.length === 0) {
      localWarnings.push({
        type: 'error',
        message: `Clue "${clue.description.slice(0, 40)}..." has no character assigned to reveal it`,
      });
    }
  });

  // If no validation has been run and no local warnings, show nothing
  const hasApiWarnings = validationWarnings && validationWarnings.length > 0;
  const hasLocalWarnings = localWarnings.length > 0;

  if (!hasApiWarnings && !hasLocalWarnings) return null;

  // Determine the severity color for API warnings
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '⚠️';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-300';
      case 'warning': return 'text-amber-200';
      case 'info': return 'text-blue-200';
      default: return 'text-amber-200';
    }
  };

  // Count by severity
  const criticalCount = validationWarnings?.filter(w => w.severity === 'critical').length || 0;
  const warningCount = validationWarnings?.filter(w => w.severity === 'warning').length || 0;
  const infoCount = validationWarnings?.filter(w => w.severity === 'info').length || 0;

  return (
    <div className="space-y-4">
      {/* API Validation Results */}
      {hasApiWarnings && (
        <div className={`p-4 rounded-xl ${criticalCount > 0 ? 'bg-red-500/10 border border-red-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
          <h3 className={`text-sm font-semibold flex items-center gap-2 mb-3 ${criticalCount > 0 ? 'text-red-300' : 'text-amber-300'}`}>
            <span>🔍</span>
            Validation Results
            <span className="flex gap-2 ml-2">
              {criticalCount > 0 && <span className="px-1.5 py-0.5 rounded bg-red-500/30 text-xs">{criticalCount} critical</span>}
              {warningCount > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-500/30 text-xs">{warningCount} warnings</span>}
              {infoCount > 0 && <span className="px-1.5 py-0.5 rounded bg-blue-500/30 text-xs">{infoCount} info</span>}
            </span>
          </h3>
          <div className="space-y-2">
            {validationWarnings!.map((warning, index) => (
              <div key={index} className={`flex items-start gap-2 text-sm ${getSeverityColor(warning.severity)}`}>
                <span className="flex-shrink-0">{getSeverityIcon(warning.severity)}</span>
                <div className="flex-1">
                  <span>{warning.message}</span>
                  {warning.suggestion && (
                    <p className="text-xs text-slate-400 mt-0.5">💡 {warning.suggestion}</p>
                  )}
                </div>
                <span className="px-1.5 py-0.5 rounded bg-slate-700/50 text-xs text-slate-400 capitalize">
                  {warning.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Local Quick Checks (if no API validation yet) */}
      {!hasApiWarnings && hasLocalWarnings && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <h3 className="text-sm font-semibold text-amber-300 flex items-center gap-2 mb-3">
            <span>⚠️</span>
            Quick Checks ({localWarnings.length})
            <span className="text-xs text-slate-400 font-normal">Click &quot;Validate&quot; for full analysis</span>
          </h3>
          <div className="space-y-2">
            {localWarnings.map((warning, index) => (
              <div
                key={index}
                className={`flex items-start gap-2 text-sm ${
                  warning.type === 'error' ? 'text-red-300' : 'text-amber-200'
                }`}
              >
                <span>{warning.type === 'error' ? '❌' : '⚠️'}</span>
                <span>{warning.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
