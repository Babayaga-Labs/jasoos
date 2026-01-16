'use client';

import { useState } from 'react';
import { useWizard, type StoryInput } from '../wizard/WizardContext';
import { StoryElementCard } from '../cards/StoryElementCard';
import { EditableTimeline } from '../cards/EditableTimeline';
import { SkeletonCard } from '../cards/FadeInCard';
import { TIME_PERIODS } from '@/packages/ai/types/ugc-types';

export function StoryStage() {
  const { state, dispatch, canProceedFromStory, canProceedFromScaffold } = useWizard();
  const {
    useScaffoldFlow,
    // Legacy flow state
    storyInput,
    generatedStory,
    storyGenerating,
    storyComplete,
    // Scaffold flow state
    initialPremise,
    scaffold,
    scaffoldGenerating,
    scaffoldComplete,
  } = state;

  // Scaffold flow handlers
  const handlePremiseChange = (value: string) => {
    dispatch({ type: 'UPDATE_INITIAL_PREMISE', premise: value });
  };

  const handleGenerateScaffold = async () => {
    dispatch({ type: 'START_SCAFFOLD_GENERATION' });

    try {
      const response = await fetch('/api/ugc/generate-scaffold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ premise: initialPremise }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate scaffold');
      }

      dispatch({ type: 'COMPLETE_SCAFFOLD_GENERATION', scaffold: data.scaffold });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        error: error instanceof Error ? error.message : 'Scaffold generation failed',
      });
    }
  };

  const handleProceedFromScaffold = () => {
    dispatch({ type: 'GO_TO_STAGE', stage: 'characters' });
  };

  // Legacy flow handlers
  const handleInputChange = (field: keyof StoryInput, value: string) => {
    dispatch({ type: 'UPDATE_STORY_INPUT', field, value });
  };

  const handleGenerate = async () => {
    dispatch({ type: 'START_STORY_GENERATION' });

    try {
      const response = await fetch('/api/ugc/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: storyInput.title,
          settingLocation: storyInput.settingLocation,
          timePeriod: storyInput.timePeriod,
          customTimePeriod: storyInput.customTimePeriod,
          premise: storyInput.premise,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate story');
      }

      dispatch({
        type: 'COMPLETE_STORY_GENERATION',
        story: data.story,
        storyId: data.storyId,
      });
    } catch (error) {
      dispatch({
        type: 'SET_ERROR',
        error: error instanceof Error ? error.message : 'Story generation failed',
      });
    }
  };

  const handleProceed = () => {
    dispatch({ type: 'GO_TO_STAGE', stage: 'characters' });
  };

  // ============================================================================
  // SCAFFOLD FLOW UI
  // ============================================================================

  if (useScaffoldFlow) {
    // Scaffold: Show premise input form
    if (!scaffoldComplete && !scaffoldGenerating) {
      return (
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">
              What's Your Mystery About?
            </h2>
            <p className="text-slate-400">
              Describe the basic situation - we'll help you build the rest
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Your Mystery Premise
                <span className="text-slate-500 font-normal ml-2">
                  (The situation, crime, or mystery to solve)
                </span>
              </label>
              <textarea
                value={initialPremise}
                onChange={(e) => handlePremiseChange(e.target.value)}
                placeholder="A renowned art collector is found dead in their locked gallery, surrounded by priceless paintings. The security system shows no intruders, but one painting has been replaced with a forgery..."
                rows={5}
                className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all resize-none"
              />
              <p className="text-xs text-slate-500 mt-2">
                Be creative! Include the setting, crime type, and any interesting details.
              </p>
            </div>

            <button
              onClick={handleGenerateScaffold}
              disabled={initialPremise.trim().length < 10}
              className={`
                w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all transform
                ${initialPremise.trim().length >= 10
                  ? 'bg-gradient-to-r from-amber-500 via-violet-500 to-pink-500 text-white hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98]'
                  : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                }
              `}
            >
              Generate Story Foundation
            </button>
          </div>
        </div>
      );
    }

    // Scaffold: Show generating state
    if (scaffoldGenerating) {
      return (
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-slate-800/50 border border-violet-500/30 mb-4">
              <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-violet-300 font-medium">Building your mystery scaffold...</span>
            </div>
            <p className="text-slate-500">This usually takes 5-10 seconds</p>
          </div>

          <div className="grid gap-6">
            <SkeletonCard className="h-32" />
            <SkeletonCard className="h-48" />
          </div>
        </div>
      );
    }

    // Scaffold: Show generated scaffold for review
    if (scaffoldComplete && scaffold) {
      return (
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">
              Your Mystery Foundation
            </h2>
            <p className="text-slate-400">
              Review your story setup, then fill in the character details
            </p>
          </div>

          <div className="space-y-6">
            {/* Title & Hook */}
            <div
              className="opacity-0 animate-fade-in-up"
              style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}
            >
              <div className="relative rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40 backdrop-blur-sm overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-violet-500 to-pink-500 opacity-60" />
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-white mb-3">{scaffold.title}</h3>
                  <p className="text-slate-300 leading-relaxed">{scaffold.hook}</p>
                </div>
              </div>
            </div>

            {/* Setting & Crime Type */}
            <StoryElementCard title="Setting" icon="🏛️" delay={100}>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-sm">📍</span>
                  <span className="text-white">{scaffold.setting.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-sm">🕐</span>
                  <span className="text-white">{scaffold.setting.timePeriod}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-sm">🎭</span>
                  <span className="text-white capitalize">{scaffold.crimeType}</span>
                </div>
              </div>
              <p className="text-slate-400 mt-3 text-sm italic">{scaffold.setting.atmosphere}</p>
            </StoryElementCard>

            {/* Victim Context (if present) */}
            {scaffold.victimContext && (
              <StoryElementCard title="The Victim" icon="💀" delay={200}>
                <p className="text-slate-300">{scaffold.victimContext}</p>
              </StoryElementCard>
            )}

            {/* Suggested Characters Preview */}
            <div
              className="opacity-0 animate-fade-in-up"
              style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}
            >
              <div className="relative rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40 backdrop-blur-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">👥</span>
                    <h3 className="font-semibold text-white">Suggested Characters</h3>
                    <span className="text-xs text-slate-500 ml-auto">You'll flesh these out next</span>
                  </div>
                  <div className="grid gap-3">
                    {scaffold.suggestedCharacters.map((char, i) => (
                      <div
                        key={char.suggestionId}
                        className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/40"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/30 to-pink-500/30 flex items-center justify-center text-sm font-medium text-white">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{char.suggestedName}</span>
                            <span className="text-slate-500">-</span>
                            <span className="text-slate-400 text-sm">{char.role}</span>
                          </div>
                          <p className="text-slate-500 text-sm mt-1">{char.connectionToCrime}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Proceed Button */}
            <div
              className="pt-4 opacity-0 animate-fade-in-up"
              style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}
            >
              <button
                onClick={handleProceedFromScaffold}
                disabled={!canProceedFromScaffold}
                className="w-full py-4 px-6 rounded-xl font-semibold text-lg bg-gradient-to-r from-amber-500 via-violet-500 to-pink-500 text-white hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98] transition-all transform"
              >
                Continue to Character Details
              </button>
            </div>
          </div>
        </div>
      );
    }
  }

  // ============================================================================
  // LEGACY FLOW UI (kept for backward compatibility)
  // ============================================================================

  const isFormValid =
    storyInput.title.trim() &&
    storyInput.settingLocation.trim() &&
    storyInput.timePeriod &&
    (storyInput.timePeriod !== 'other' || storyInput.customTimePeriod.trim()) &&
    storyInput.premise.trim().length >= 20;

  // Show form if not yet generated
  if (!storyComplete && !storyGenerating) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-3">
            Let's Build Your Mystery
          </h2>
          <p className="text-slate-400">
            Start with the basics - where and when does your story take place?
          </p>
        </div>

        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Story Title
            </label>
            <input
              type="text"
              value={storyInput.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="The Mystery at Midnight Manor"
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
            />
          </div>

          {/* Setting Location */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Setting Location
            </label>
            <input
              type="text"
              value={storyInput.settingLocation}
              onChange={(e) => handleInputChange('settingLocation', e.target.value)}
              placeholder="A grand Victorian mansion on a stormy night"
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
            />
          </div>

          {/* Time Period */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Time Period
            </label>
            <select
              value={storyInput.timePeriod}
              onChange={(e) => handleInputChange('timePeriod', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
            >
              <option value="">Select a time period...</option>
              {TIME_PERIODS.map((period) => (
                <option key={period.value} value={period.value}>
                  {period.label}
                </option>
              ))}
            </select>

            {storyInput.timePeriod === 'other' && (
              <input
                type="text"
                value={storyInput.customTimePeriod}
                onChange={(e) => handleInputChange('customTimePeriod', e.target.value)}
                placeholder="Specify time period..."
                className="w-full mt-3 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all"
              />
            )}
          </div>

          {/* Premise */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Premise / Hook
              <span className="text-slate-500 font-normal ml-2">
                (What draws the player in?)
              </span>
            </label>
            <textarea
              value={storyInput.premise}
              onChange={(e) => handleInputChange('premise', e.target.value)}
              placeholder="A priceless artifact has vanished from a locked room during a lavish dinner party. The host lies dead, the guests are trapped by the storm, and everyone has something to hide..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 focus:outline-none transition-all resize-none"
            />
            <p className="text-xs text-slate-500 mt-2">
              {storyInput.premise.length}/20 characters minimum
            </p>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!isFormValid}
            className={`
              w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all transform
              ${isFormValid
                ? 'bg-gradient-to-r from-amber-500 via-violet-500 to-pink-500 text-white hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98]'
                : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
              }
            `}
          >
            Generate Story Foundation
          </button>
        </div>
      </div>
    );
  }

  // Show generating state
  if (storyGenerating) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-slate-800/50 border border-violet-500/30 mb-4">
            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-violet-300 font-medium">Crafting your story...</span>
          </div>
          <p className="text-slate-500">This usually takes about 10-15 seconds</p>
        </div>

        <div className="grid gap-6">
          <SkeletonCard className="h-40" />
          <SkeletonCard className="h-32" />
          <SkeletonCard className="h-64" />
        </div>
      </div>
    );
  }

  // Show generated results (legacy)
  const [isEditingPremise, setIsEditingPremise] = useState(false);
  const [premiseValue, setPremiseValue] = useState('');

  const handleStartEditPremise = () => {
    setPremiseValue(generatedStory?.premise || '');
    setIsEditingPremise(true);
  };

  const handleSavePremise = () => {
    if (premiseValue.trim()) {
      dispatch({ type: 'UPDATE_STORY_PREMISE', premise: premiseValue.trim() });
    }
    setIsEditingPremise(false);
  };

  const handleCancelPremise = () => {
    setIsEditingPremise(false);
    setPremiseValue('');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-white mb-3">
          Your Story Foundation
        </h2>
        <p className="text-slate-400">
          Review and edit your mystery's details before adding characters
        </p>
      </div>

      {generatedStory && (
        <div className="space-y-6">
          {/* Setting Card - Simplified */}
          <StoryElementCard
            title="Setting"
            icon="🏛️"
            delay={0}
          >
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-sm">📍</span>
                <span className="text-white">{generatedStory.setting.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 text-sm">🕐</span>
                <span className="text-white">{generatedStory.setting.timePeriod}</span>
              </div>
            </div>
          </StoryElementCard>

          {/* Editable Premise Card */}
          <div
            className="opacity-0 animate-fade-in-up"
            style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}
          >
            <div className="relative group rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/40 backdrop-blur-sm overflow-hidden hover:border-violet-500/30 transition-colors">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-violet-500 to-pink-500 opacity-60" />
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎯</span>
                    <h3 className="font-semibold text-white">The Hook</h3>
                  </div>
                  {!isEditingPremise && (
                    <button
                      onClick={handleStartEditPremise}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {isEditingPremise ? (
                  <div className="space-y-3">
                    <textarea
                      value={premiseValue}
                      onChange={(e) => setPremiseValue(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-700/50 border border-violet-500/50 text-white focus:border-violet-400 focus:outline-none resize-none"
                      rows={4}
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSavePremise}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600/30 text-emerald-300 hover:bg-emerald-500/40 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelPremise}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-600/50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-200 leading-relaxed cursor-pointer hover:bg-slate-700/20 rounded-lg px-2 py-1 -mx-2 transition-colors" onClick={handleStartEditPremise}>
                    {generatedStory.premise}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Editable Timeline */}
          <EditableTimeline
            events={generatedStory.actualEvents}
            onUpdateEvent={(index, event) => dispatch({ type: 'UPDATE_TIMELINE_EVENT', index, event })}
            onDeleteEvent={(index) => dispatch({ type: 'DELETE_TIMELINE_EVENT', index })}
            onAddEvent={(event) => dispatch({ type: 'ADD_TIMELINE_EVENT', event })}
            delay={300}
          />

          {/* Stats - Smaller */}
          <div
            className="flex items-center justify-center gap-4 py-2 opacity-0 animate-fade-in"
            style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/30 text-sm">
              <span className="text-amber-400">Difficulty:</span>
              <span className="text-white font-medium capitalize">{generatedStory.difficulty}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/30 text-sm">
              <span className="text-violet-400">Est. Time:</span>
              <span className="text-white font-medium">{generatedStory.estimatedMinutes} min</span>
            </div>
          </div>

          {/* Proceed Button */}
          <div
            className="pt-6 opacity-0 animate-fade-in-up"
            style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}
          >
            <button
              onClick={handleProceed}
              disabled={!canProceedFromStory}
              className="w-full py-4 px-6 rounded-xl font-semibold text-lg bg-gradient-to-r from-amber-500 via-violet-500 to-pink-500 text-white hover:scale-[1.02] hover:shadow-lg hover:shadow-violet-500/25 active:scale-[0.98] transition-all transform"
            >
              Continue to Characters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
