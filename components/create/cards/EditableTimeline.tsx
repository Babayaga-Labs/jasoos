'use client';

import { useState } from 'react';

interface EditableTimelineProps {
  events: string[];
  onUpdateEvent: (index: number, event: string) => void;
  onDeleteEvent: (index: number) => void;
  onAddEvent: (event: string) => void;
  delay?: number;
}

export function EditableTimeline({
  events,
  onUpdateEvent,
  onDeleteEvent,
  onAddEvent,
  delay = 0,
}: EditableTimelineProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newEventValue, setNewEventValue] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(events[index]);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editValue.trim()) {
      onUpdateEvent(editingIndex, editValue.trim());
      setEditingIndex(null);
      setEditValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditValue('');
  };

  const handleAddEvent = () => {
    if (newEventValue.trim()) {
      onAddEvent(newEventValue.trim());
      setNewEventValue('');
      setShowAddForm(false);
    }
  };

  return (
    <div
      className="opacity-0 animate-fade-in-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40 backdrop-blur-sm overflow-hidden">
        {/* Gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-violet-500 opacity-60" />

        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏰</span>
              <h3 className="font-semibold text-white">Timeline of Events</h3>
            </div>
            <span className="text-xs text-slate-500">Click to edit</span>
          </div>

          <div className="relative pl-6">
            {/* Timeline line */}
            <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-violet-500/50" />

            <div className="space-y-3">
              {events.map((event, index) => (
                <div
                  key={index}
                  className="relative group"
                >
                  {/* Timeline dot */}
                  <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-violet-500 border-2 border-slate-900" />

                  {editingIndex === index ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-700/50 border border-violet-500/50 text-white text-sm focus:border-violet-400 focus:outline-none resize-none"
                        rows={2}
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="px-3 py-1 text-xs font-medium rounded-lg bg-violet-600/30 text-violet-300 hover:bg-violet-500/40 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-1 text-xs font-medium rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex items-start gap-2 cursor-pointer hover:bg-slate-700/20 rounded-lg px-2 py-1 -mx-2 transition-colors"
                      onClick={() => handleStartEdit(index)}
                    >
                      <p className="flex-1 text-slate-300 text-sm leading-relaxed">{event}</p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(index);
                          }}
                          className="p-1 rounded text-slate-500 hover:text-violet-400 transition-colors"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteEvent(index);
                          }}
                          className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add new event */}
          <div className="mt-4 pt-4 border-t border-slate-700/30">
            {showAddForm ? (
              <div className="flex flex-col gap-2 pl-6">
                <textarea
                  value={newEventValue}
                  onChange={(e) => setNewEventValue(e.target.value)}
                  placeholder="e.g., 8:30 PM - The lights flickered and went out..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white text-sm placeholder-slate-500 focus:border-violet-500/50 focus:outline-none resize-none"
                  rows={2}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddEvent}
                    disabled={!newEventValue.trim()}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                      newEventValue.trim()
                        ? 'bg-violet-600/30 text-violet-300 hover:bg-violet-500/40'
                        : 'bg-slate-700/30 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    Add Event
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewEventValue('');
                    }}
                    className="px-3 py-1 text-xs font-medium rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full py-2 px-4 rounded-lg border border-dashed border-slate-600/50 text-slate-400 hover:border-violet-500/50 hover:text-violet-300 transition-all text-sm"
              >
                + Add Timeline Event
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
