'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type {
  UGCFormInput,
  UGCCharacterInput,
  UGCCrimeInput,
  UGCGeneratedData,
  UGCDraftState,
  EditableSection,
  PromptTrace,
} from '@/packages/ai/types/ugc-types';
import { StoryBasicsSection } from '@/components/create/StoryBasicsSection';
import { CharactersSection, createEmptyCharacter } from '@/components/create/CharactersSection';
import { CrimeSection } from '@/components/create/CrimeSection';
import { GenerationProgress, GenerationStep } from '@/components/create/GenerationProgress';
import { ReviewEditor } from '@/components/create/ReviewEditor';

type CreationPhase = 'create' | 'generating' | 'review' | 'saving';

// Initialize with 3 empty characters
function createInitialCharacters(): UGCCharacterInput[] {
  return [
    createEmptyCharacter(),
    createEmptyCharacter(),
    createEmptyCharacter(),
  ];
}

function createInitialCrime(): UGCCrimeInput {
  return {
    crimeType: 'murder',
    culpritId: '',
    motive: '',
    method: '',
  };
}

export default function CreatePage() {
  const router = useRouter();

  // Phase state
  const [phase, setPhase] = useState<CreationPhase>('create');

  // Form state (Phase 1)
  const [title, setTitle] = useState('');
  const [settingLocation, setSettingLocation] = useState('');
  const [timePeriod, setTimePeriod] = useState('');
  const [customTimePeriod, setCustomTimePeriod] = useState('');
  const [premise, setPremise] = useState('');
  const [characters, setCharacters] = useState<UGCCharacterInput[]>(createInitialCharacters);
  const [crime, setCrime] = useState<UGCCrimeInput>(createInitialCrime);

  // Generation state (Phase 2)
  const [currentStep, setCurrentStep] = useState<GenerationStep | null>(null);
  const [progressMessage, setProgressMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Generated/Draft state (Phase 3)
  const [storyId, setStoryId] = useState<string | null>(null);
  const [draft, setDraft] = useState<UGCDraftState | null>(null);
  const [promptTraces, setPromptTraces] = useState<PromptTrace[]>([]);

  // Build form input object
  const buildFormInput = useCallback((): UGCFormInput => ({
    title,
    settingLocation,
    timePeriod: timePeriod as UGCFormInput['timePeriod'],
    customTimePeriod,
    premise,
    characters,
    crime,
  }), [title, settingLocation, timePeriod, customTimePeriod, premise, characters, crime]);

  // Validate form before submission
  const validateForm = (): string | null => {
    if (!title.trim()) return 'Title is required';
    if (!settingLocation.trim()) return 'Setting location is required';
    if (!timePeriod) return 'Time period is required';
    if (timePeriod === 'other' && !customTimePeriod.trim()) return 'Custom time period is required';
    if (!premise.trim() || premise.length < 20) return 'Premise must be at least 20 characters';
    if (characters.length < 3) return 'At least 3 characters are required';
    for (const char of characters) {
      if (!char.name.trim() || !char.role.trim() || !char.description.trim()) {
        return 'All characters must have name, role, and description';
      }
    }
    if (!crime.crimeType) return 'Crime type is required';
    if (!crime.culpritId) return 'Culprit must be selected';
    if (!crime.motive.trim()) return 'Motive is required';
    if (!crime.method.trim()) return 'Method is required';
    return null;
  };

  // Handle generation (Phase 1 → 2)
  const handleGenerate = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setPhase('generating');
    setError(null);
    setCurrentStep(null);
    setProgress(0);

    try {
      const formInput = buildFormInput();
      const response = await fetch('/api/ugc/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formInput }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start generation');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

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
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'progress') {
                setCurrentStep(data.step);
                setProgressMessage(data.message);
                setProgress(data.progress);
              } else if (data.type === 'complete') {
                // Move to review phase with generated data
                setStoryId(data.storyId);
                const generatedData = data.data as UGCGeneratedData;
                setDraft({
                  story: generatedData.story,
                  characters: generatedData.characters,
                  plotPoints: generatedData.plotPoints,
                  editedSections: new Set(),
                  regeneratingSections: new Set(),
                });
                // Store prompt traces for saving later
                if (data.promptTraces) {
                  setPromptTraces(data.promptTraces);
                }
                setPhase('review');
                return;
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch (parseError) {
              // Ignore parse errors for incomplete JSON
            }
          }
        }
      }
    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'Generation failed');
      setPhase('create');
    }
  };

  // Handle draft updates (Phase 3)
  const handleDraftUpdate = (updatedDraft: UGCDraftState) => {
    setDraft(updatedDraft);
  };

  // Handle section regeneration (Phase 3)
  const handleRegenerate = async (section: EditableSection) => {
    if (!draft || !storyId) return;

    // Mark section as regenerating
    setDraft({
      ...draft,
      regeneratingSections: new Set([...draft.regeneratingSections, section]),
    });

    try {
      const formInput = buildFormInput();
      const response = await fetch('/api/ugc/regenerate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section,
          formInput,
          currentDraft: {
            ...draft,
            editedSections: Array.from(draft.editedSections),
            regeneratingSections: Array.from(draft.regeneratingSections),
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Regeneration failed');
      }

      const result = await response.json();

      // Update draft with regenerated data
      setDraft(prev => {
        if (!prev) return prev;
        const newDraft = { ...prev };

        if (result.data.story) {
          newDraft.story = { ...prev.story, ...result.data.story };
        }
        if (result.data.characters) {
          newDraft.characters = result.data.characters;
        }
        if (result.data.plotPoints) {
          newDraft.plotPoints = result.data.plotPoints;
        }

        newDraft.regeneratingSections = new Set(
          [...prev.regeneratingSections].filter(s => s !== section)
        );

        return newDraft;
      });
    } catch (err) {
      console.error('Regeneration error:', err);
      setError(err instanceof Error ? err.message : 'Regeneration failed');
      // Remove from regenerating
      setDraft(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          regeneratingSections: new Set(
            [...prev.regeneratingSections].filter(s => s !== section)
          ),
        };
      });
    }
  };

  // Handle save and launch (Phase 3 → 4)
  const handleSaveAndLaunch = async () => {
    if (!draft || !storyId) return;

    setPhase('saving');
    setError(null);
    setCurrentStep(null);
    setProgress(0);

    try {
      const formInput = buildFormInput();
      const response = await fetch('/api/ugc/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId,
          formInput,
          draft: {
            ...draft,
            editedSections: Array.from(draft.editedSections),
            regeneratingSections: [],
          },
          promptTraces, // Include prompt traces for observability
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

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
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'progress') {
                setCurrentStep(data.step);
                setProgressMessage(data.message);
                setProgress(data.progress);
              } else if (data.type === 'complete') {
                // Navigate to game
                router.push(`/game/${data.storyId}`);
                return;
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch (parseError) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Save failed');
      setPhase('review');
    }
  };

  // Handle back to edit
  const handleBackToEdit = () => {
    setPhase('create');
    setDraft(null);
    setStoryId(null);
    setError(null);
  };

  // Handle retry from error
  const handleRetry = () => {
    setError(null);
    if (phase === 'generating' || phase === 'saving') {
      setPhase('create');
    }
  };

  const isDisabled = phase !== 'create';

  return (
    <main className="min-h-screen">
      {/* Header */}
      <div className="py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center text-slate-400 hover:text-amber-400 transition-colors mb-4"
          >
            ← Back to Cases
          </Link>

          <div className="text-center">
            <h1 className="text-3xl font-bold mb-1">
              <span className="text-amber-400">Create</span> Your Own Mystery
            </h1>
            <p className="text-slate-400 text-sm">
              {phase === 'create' && 'Fill in the details below to generate your mystery'}
              {phase === 'generating' && 'Generating your mystery...'}
              {phase === 'review' && 'Review and edit the generated content'}
              {phase === 'saving' && 'Saving and generating images...'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 pb-20">
        {/* Phase 1: Create Form */}
        {phase === 'create' && (
          <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} className="space-y-8">
            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
                {error}
              </div>
            )}

            <StoryBasicsSection
              title={title}
              settingLocation={settingLocation}
              timePeriod={timePeriod}
              customTimePeriod={customTimePeriod}
              premise={premise}
              onTitleChange={setTitle}
              onSettingLocationChange={setSettingLocation}
              onTimePeriodChange={setTimePeriod}
              onCustomTimePeriodChange={setCustomTimePeriod}
              onPremiseChange={setPremise}
              disabled={isDisabled}
            />

            <CharactersSection
              characters={characters}
              onCharactersChange={setCharacters}
              disabled={isDisabled}
            />

            <CrimeSection
              crime={crime}
              characters={characters}
              onCrimeChange={setCrime}
              disabled={isDisabled}
            />

            <button
              type="submit"
              disabled={isDisabled}
              className="w-full btn btn-primary py-3 text-lg font-medium disabled:opacity-50"
            >
              Generate Mystery
            </button>
          </form>
        )}

        {/* Phase 2: Generation Progress */}
        {phase === 'generating' && (
          <GenerationProgress
            currentStep={currentStep}
            message={progressMessage}
            progress={progress}
            error={error}
            onRetry={handleRetry}
          />
        )}

        {/* Phase 3: Review & Edit */}
        {phase === 'review' && draft && (
          <ReviewEditor
            draft={draft}
            formInput={buildFormInput()}
            onDraftUpdate={handleDraftUpdate}
            onRegenerate={handleRegenerate}
            onSaveAndLaunch={handleSaveAndLaunch}
            onBackToEdit={handleBackToEdit}
            error={error}
          />
        )}

        {/* Phase 4: Saving */}
        {phase === 'saving' && (
          <GenerationProgress
            currentStep={currentStep}
            message={progressMessage}
            progress={progress}
            error={error}
            onRetry={handleRetry}
          />
        )}
      </div>
    </main>
  );
}
