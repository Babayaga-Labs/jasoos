'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type {
  UGCCharacterInput,
  UGCCrimeInput,
  UGCGeneratedStory,
  UGCGeneratedCharacter,
  UGCGeneratedPlotPoint,
} from '@/packages/ai/types/ugc-types';

// ============================================================================
// Wizard Types
// ============================================================================

export type WizardStage = 'story' | 'characters' | 'clues' | 'world';

export interface StoryInput {
  title: string;
  settingLocation: string;
  timePeriod: string;
  customTimePeriod: string;
  premise: string;
}

export interface CharacterWizardItem {
  input: UGCCharacterInput;
  generated: UGCGeneratedCharacter | null;
  isGenerating: boolean;
  isComplete: boolean;
}

export interface WizardState {
  // Navigation
  currentStage: WizardStage;
  storyId: string | null;

  // Stage 1: Story
  storyInput: StoryInput;
  generatedStory: UGCGeneratedStory | null;
  storyGenerating: boolean;
  storyComplete: boolean;

  // Stage 2: Characters
  characters: CharacterWizardItem[];
  currentCharacterInput: UGCCharacterInput | null;

  // Stage 3: Clues
  crimeInput: UGCCrimeInput;
  generatedPlotPoints: UGCGeneratedPlotPoint[] | null;
  minimumPointsToAccuse: number;
  perfectScoreThreshold: number;
  cluesGenerating: boolean;
  cluesComplete: boolean;

  // Stage 4: World
  sceneImageUrl: string | null;
  sceneGenerating: boolean;
  worldComplete: boolean;

  // Global
  error: string | null;
  isSaving: boolean;
}

// ============================================================================
// Actions
// ============================================================================

type WizardAction =
  // Navigation
  | { type: 'GO_TO_STAGE'; stage: WizardStage }
  | { type: 'SET_STORY_ID'; storyId: string }

  // Story Stage
  | { type: 'UPDATE_STORY_INPUT'; field: keyof StoryInput; value: string }
  | { type: 'START_STORY_GENERATION' }
  | { type: 'COMPLETE_STORY_GENERATION'; story: UGCGeneratedStory; storyId: string }
  | { type: 'UPDATE_GENERATED_STORY'; updates: Partial<UGCGeneratedStory> }
  | { type: 'UPDATE_STORY_PREMISE'; premise: string }
  | { type: 'UPDATE_STORY_TIMELINE'; events: string[] }
  | { type: 'ADD_TIMELINE_EVENT'; event: string }
  | { type: 'UPDATE_TIMELINE_EVENT'; index: number; event: string }
  | { type: 'DELETE_TIMELINE_EVENT'; index: number }

  // Characters Stage
  | { type: 'SET_CURRENT_CHARACTER_INPUT'; input: UGCCharacterInput }
  | { type: 'CLEAR_CURRENT_CHARACTER_INPUT' }
  | { type: 'START_CHARACTER_GENERATION'; input: UGCCharacterInput }
  | { type: 'COMPLETE_CHARACTER_GENERATION'; tempId: string; character: UGCGeneratedCharacter }
  | { type: 'UPDATE_CHARACTER'; tempId: string; updates: Partial<UGCGeneratedCharacter> }
  | { type: 'DELETE_CHARACTER'; tempId: string }
  | { type: 'REGENERATE_CHARACTER'; tempId: string }

  // Clues Stage
  | { type: 'UPDATE_CRIME_INPUT'; field: keyof UGCCrimeInput; value: string }
  | { type: 'START_CLUES_GENERATION' }
  | { type: 'COMPLETE_CLUES_GENERATION'; plotPoints: UGCGeneratedPlotPoint[]; minPoints: number; perfectScore: number; updatedStory: UGCGeneratedStory; updatedCharacters: UGCGeneratedCharacter[] }
  | { type: 'UPDATE_PLOT_POINT'; id: string; updates: Partial<UGCGeneratedPlotPoint> }

  // World Stage
  | { type: 'START_SCENE_GENERATION' }
  | { type: 'COMPLETE_SCENE_GENERATION'; imageUrl: string }

  // Global
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'START_SAVING' }
  | { type: 'COMPLETE_SAVING' }
  | { type: 'RESET_WIZARD' };

// ============================================================================
// Initial State
// ============================================================================

function createInitialState(): WizardState {
  return {
    currentStage: 'story',
    storyId: null,

    storyInput: {
      title: '',
      settingLocation: '',
      timePeriod: '',
      customTimePeriod: '',
      premise: '',
    },
    generatedStory: null,
    storyGenerating: false,
    storyComplete: false,

    characters: [],
    currentCharacterInput: null,

    crimeInput: {
      crimeType: 'murder',
      culpritId: '',
      motive: '',
      method: '',
    },
    generatedPlotPoints: null,
    minimumPointsToAccuse: 50,
    perfectScoreThreshold: 150,
    cluesGenerating: false,
    cluesComplete: false,

    sceneImageUrl: null,
    sceneGenerating: false,
    worldComplete: false,

    error: null,
    isSaving: false,
  };
}

// ============================================================================
// Reducer
// ============================================================================

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    // Navigation
    case 'GO_TO_STAGE':
      return { ...state, currentStage: action.stage, error: null };

    case 'SET_STORY_ID':
      return { ...state, storyId: action.storyId };

    // Story Stage
    case 'UPDATE_STORY_INPUT':
      return {
        ...state,
        storyInput: { ...state.storyInput, [action.field]: action.value },
      };

    case 'START_STORY_GENERATION':
      return { ...state, storyGenerating: true, error: null };

    case 'COMPLETE_STORY_GENERATION':
      return {
        ...state,
        storyGenerating: false,
        storyComplete: true,
        generatedStory: action.story,
        storyId: action.storyId,
      };

    case 'UPDATE_GENERATED_STORY':
      if (!state.generatedStory) return state;
      return {
        ...state,
        generatedStory: { ...state.generatedStory, ...action.updates },
      };

    case 'UPDATE_STORY_PREMISE':
      if (!state.generatedStory) return state;
      return {
        ...state,
        generatedStory: { ...state.generatedStory, premise: action.premise },
      };

    case 'UPDATE_STORY_TIMELINE':
      if (!state.generatedStory) return state;
      return {
        ...state,
        generatedStory: { ...state.generatedStory, actualEvents: action.events },
      };

    case 'ADD_TIMELINE_EVENT':
      if (!state.generatedStory) return state;
      return {
        ...state,
        generatedStory: {
          ...state.generatedStory,
          actualEvents: [...state.generatedStory.actualEvents, action.event],
        },
      };

    case 'UPDATE_TIMELINE_EVENT':
      if (!state.generatedStory) return state;
      return {
        ...state,
        generatedStory: {
          ...state.generatedStory,
          actualEvents: state.generatedStory.actualEvents.map((e, i) =>
            i === action.index ? action.event : e
          ),
        },
      };

    case 'DELETE_TIMELINE_EVENT':
      if (!state.generatedStory) return state;
      return {
        ...state,
        generatedStory: {
          ...state.generatedStory,
          actualEvents: state.generatedStory.actualEvents.filter((_, i) => i !== action.index),
        },
      };

    // Characters Stage
    case 'SET_CURRENT_CHARACTER_INPUT':
      return { ...state, currentCharacterInput: action.input };

    case 'CLEAR_CURRENT_CHARACTER_INPUT':
      return { ...state, currentCharacterInput: null };

    case 'START_CHARACTER_GENERATION': {
      const newItem: CharacterWizardItem = {
        input: action.input,
        generated: null,
        isGenerating: true,
        isComplete: false,
      };
      return {
        ...state,
        characters: [...state.characters, newItem],
        currentCharacterInput: null,
        error: null,
      };
    }

    case 'COMPLETE_CHARACTER_GENERATION':
      return {
        ...state,
        characters: state.characters.map((c) =>
          c.input.tempId === action.tempId
            ? { ...c, generated: action.character, isGenerating: false, isComplete: true }
            : c
        ),
      };

    case 'UPDATE_CHARACTER':
      return {
        ...state,
        characters: state.characters.map((c) =>
          c.input.tempId === action.tempId && c.generated
            ? { ...c, generated: { ...c.generated, ...action.updates } }
            : c
        ),
      };

    case 'DELETE_CHARACTER':
      return {
        ...state,
        characters: state.characters.filter((c) => c.input.tempId !== action.tempId),
        // Clear culprit if deleted
        crimeInput: state.crimeInput.culpritId === action.tempId
          ? { ...state.crimeInput, culpritId: '' }
          : state.crimeInput,
      };

    case 'REGENERATE_CHARACTER':
      return {
        ...state,
        characters: state.characters.map((c) =>
          c.input.tempId === action.tempId
            ? { ...c, isGenerating: true, generated: null, isComplete: false }
            : c
        ),
      };

    // Clues Stage
    case 'UPDATE_CRIME_INPUT':
      return {
        ...state,
        crimeInput: { ...state.crimeInput, [action.field]: action.value },
      };

    case 'START_CLUES_GENERATION':
      return { ...state, cluesGenerating: true, error: null };

    case 'COMPLETE_CLUES_GENERATION':
      return {
        ...state,
        cluesGenerating: false,
        cluesComplete: true,
        generatedPlotPoints: action.plotPoints,
        minimumPointsToAccuse: action.minPoints,
        perfectScoreThreshold: action.perfectScore,
        // Update story with solution
        generatedStory: action.updatedStory,
        // Update characters with guilt status
        characters: state.characters.map(c => {
          const updatedChar = action.updatedCharacters.find(
            uc => uc.tempId === c.input.tempId || uc.id === c.generated?.id
          );
          if (updatedChar && c.generated) {
            return { ...c, generated: { ...c.generated, isGuilty: updatedChar.isGuilty } };
          }
          return c;
        }),
      };

    case 'UPDATE_PLOT_POINT':
      if (!state.generatedPlotPoints) return state;
      return {
        ...state,
        generatedPlotPoints: state.generatedPlotPoints.map((p) =>
          p.id === action.id ? { ...p, ...action.updates } : p
        ),
      };

    // World Stage
    case 'START_SCENE_GENERATION':
      return { ...state, sceneGenerating: true, error: null };

    case 'COMPLETE_SCENE_GENERATION':
      return {
        ...state,
        sceneGenerating: false,
        worldComplete: true,
        sceneImageUrl: action.imageUrl,
      };

    // Global
    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
        storyGenerating: false,
        cluesGenerating: false,
        sceneGenerating: false,
        characters: state.characters.map((c) => ({ ...c, isGenerating: false })),
      };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'START_SAVING':
      return { ...state, isSaving: true };

    case 'COMPLETE_SAVING':
      return { ...state, isSaving: false };

    case 'RESET_WIZARD':
      return createInitialState();

    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

interface WizardContextValue {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;

  // Computed helpers
  canProceedFromStory: boolean;
  canProceedFromCharacters: boolean;
  canProceedFromClues: boolean;
  completedCharacters: UGCGeneratedCharacter[];
  nonVictimCharacters: UGCGeneratedCharacter[];
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, undefined, createInitialState);

  // Computed values
  const completedCharacters = state.characters
    .filter((c) => c.isComplete && c.generated)
    .map((c) => c.generated!);

  const nonVictimCharacters = completedCharacters.filter((c) => !c.isVictim);

  const canProceedFromStory = state.storyComplete && state.generatedStory !== null;

  const canProceedFromCharacters = completedCharacters.length >= 3 &&
    !state.characters.some((c) => c.isGenerating);

  const canProceedFromClues = state.cluesComplete && state.generatedPlotPoints !== null;

  const value: WizardContextValue = {
    state,
    dispatch,
    canProceedFromStory,
    canProceedFromCharacters,
    canProceedFromClues,
    completedCharacters,
    nonVictimCharacters,
  };

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
}

// ============================================================================
// Helper: Create empty character input
// ============================================================================

export function createEmptyCharacterInput(): UGCCharacterInput {
  return {
    tempId: `char-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    role: '',
    description: '',
    uploadedImageUrl: null,
    isVictim: false,
    personalityTraits: [],
    secret: '',
  };
}
