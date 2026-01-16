'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type {
  UGCCharacterInput,
  UGCCrimeInput,
  UGCGeneratedStory,
  UGCGeneratedCharacter,
  UGCGeneratedPlotPoint,
  // New scaffold-based types
  UGCStoryScaffold,
  UGCCharacterFromScaffold,
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

// New scaffold-based character input (user fills these)
export interface ScaffoldCharacterItem {
  // From scaffold suggestion
  suggestionId: string;
  suggestedName: string;
  suggestedRole: string;
  connectionToCrime: string;
  potentialMotive: string;
  // User fills these
  name: string;
  role: string;
  appearance: string;
  personalityTraits: string[];
  secret: string;
  isCulprit: boolean;
  uploadedImageUrl: string | null;
  // State
  isComplete: boolean;
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

  // NEW: Scaffold-based flow flag
  useScaffoldFlow: boolean;

  // Stage 1: Story (Legacy flow)
  storyInput: StoryInput;
  generatedStory: UGCGeneratedStory | null;
  storyGenerating: boolean;
  storyComplete: boolean;

  // Stage 1: Scaffold flow - premise and scaffold
  initialPremise: string;
  scaffold: UGCStoryScaffold | null;
  scaffoldGenerating: boolean;
  scaffoldComplete: boolean;

  // Stage 2: Characters (Legacy)
  characters: CharacterWizardItem[];
  currentCharacterInput: UGCCharacterInput | null;

  // Stage 2: Characters (Scaffold flow)
  scaffoldCharacters: ScaffoldCharacterItem[];

  // Stage 3: Clues / Crime
  crimeInput: UGCCrimeInput;
  // Scaffold flow crime details
  crimeDetails: {
    motive: string;
    method: string;
  };
  generatedPlotPoints: UGCGeneratedPlotPoint[] | null;
  minimumPointsToAccuse: number;
  perfectScoreThreshold: number;
  cluesGenerating: boolean;
  cluesComplete: boolean;

  // Stage 4: World / Final Generation
  sceneImageUrl: string | null;
  sceneGenerating: boolean;
  worldComplete: boolean;
  finalGenerating: boolean;

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

  // Story Stage (Legacy)
  | { type: 'UPDATE_STORY_INPUT'; field: keyof StoryInput; value: string }
  | { type: 'START_STORY_GENERATION' }
  | { type: 'COMPLETE_STORY_GENERATION'; story: UGCGeneratedStory; storyId: string }
  | { type: 'UPDATE_GENERATED_STORY'; updates: Partial<UGCGeneratedStory> }
  | { type: 'UPDATE_STORY_PREMISE'; premise: string }
  | { type: 'UPDATE_STORY_TIMELINE'; events: string[] }
  | { type: 'ADD_TIMELINE_EVENT'; event: string }
  | { type: 'UPDATE_TIMELINE_EVENT'; index: number; event: string }
  | { type: 'DELETE_TIMELINE_EVENT'; index: number }

  // NEW: Scaffold Flow Actions
  | { type: 'SET_USE_SCAFFOLD_FLOW'; useScaffold: boolean }
  | { type: 'UPDATE_INITIAL_PREMISE'; premise: string }
  | { type: 'START_SCAFFOLD_GENERATION' }
  | { type: 'COMPLETE_SCAFFOLD_GENERATION'; scaffold: UGCStoryScaffold }
  | { type: 'UPDATE_SCAFFOLD'; updates: Partial<UGCStoryScaffold> }
  | { type: 'UPDATE_SCAFFOLD_CHARACTER'; suggestionId: string; updates: Partial<ScaffoldCharacterItem> }
  | { type: 'SET_CULPRIT'; suggestionId: string }
  | { type: 'UPDATE_CRIME_DETAILS'; field: 'motive' | 'method'; value: string }
  | { type: 'START_FINAL_GENERATION' }
  | { type: 'COMPLETE_FINAL_GENERATION'; story: UGCGeneratedStory; characters: UGCGeneratedCharacter[]; plotPoints: UGCGeneratedPlotPoint[]; minPoints: number; perfectScore: number; storyId: string }

  // Characters Stage (Legacy)
  | { type: 'SET_CURRENT_CHARACTER_INPUT'; input: UGCCharacterInput }
  | { type: 'CLEAR_CURRENT_CHARACTER_INPUT' }
  | { type: 'START_CHARACTER_GENERATION'; input: UGCCharacterInput }
  | { type: 'COMPLETE_CHARACTER_GENERATION'; tempId: string; character: UGCGeneratedCharacter }
  | { type: 'UPDATE_CHARACTER'; tempId: string; updates: Partial<UGCGeneratedCharacter> }
  | { type: 'DELETE_CHARACTER'; tempId: string }
  | { type: 'REGENERATE_CHARACTER'; tempId: string }

  // Clues Stage (Legacy)
  | { type: 'UPDATE_CRIME_INPUT'; field: keyof UGCCrimeInput; value: string }
  | { type: 'START_CLUES_GENERATION' }
  | { type: 'COMPLETE_CLUES_GENERATION'; plotPoints: UGCGeneratedPlotPoint[]; minPoints: number; perfectScore: number; updatedStory: UGCGeneratedStory; updatedCharacters: UGCGeneratedCharacter[] }
  | { type: 'UPDATE_PLOT_POINT'; id: string; updates: Partial<UGCGeneratedPlotPoint> }

  // Post-generation editing (Story Bible)
  | { type: 'UPDATE_TIMELINE_EVENT_AT'; index: number; value: string }
  | { type: 'ADD_TIMELINE_EVENT_AT'; index: number; value: string }
  | { type: 'DELETE_TIMELINE_EVENT_AT'; index: number }
  | { type: 'UPDATE_CHARACTER_KNOWLEDGE'; characterId: string; field: 'knowsAboutCrime' | 'alibi'; value: string }
  | { type: 'UPDATE_CHARACTER_KNOWS_ABOUT_OTHERS'; characterId: string; index: number; value: string }
  | { type: 'ADD_CHARACTER_KNOWS_ABOUT_OTHERS'; characterId: string; value: string }
  | { type: 'DELETE_CHARACTER_KNOWS_ABOUT_OTHERS'; characterId: string; index: number }
  | { type: 'UPDATE_SOLUTION'; field: 'culprit' | 'method' | 'motive' | 'explanation'; value: string }

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

    // NEW: Default to scaffold flow
    useScaffoldFlow: true,

    // Legacy story input
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

    // Scaffold flow
    initialPremise: '',
    scaffold: null,
    scaffoldGenerating: false,
    scaffoldComplete: false,

    // Legacy characters
    characters: [],
    currentCharacterInput: null,

    // Scaffold characters
    scaffoldCharacters: [],

    // Crime input (legacy)
    crimeInput: {
      crimeType: 'murder',
      culpritId: '',
      motive: '',
      method: '',
    },
    // Crime details (scaffold flow)
    crimeDetails: {
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
    finalGenerating: false,

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

    // ========== NEW: Scaffold Flow Actions ==========
    case 'SET_USE_SCAFFOLD_FLOW':
      return { ...state, useScaffoldFlow: action.useScaffold };

    case 'UPDATE_INITIAL_PREMISE':
      return { ...state, initialPremise: action.premise };

    case 'START_SCAFFOLD_GENERATION':
      return { ...state, scaffoldGenerating: true, error: null };

    case 'COMPLETE_SCAFFOLD_GENERATION': {
      // Convert scaffold suggestions to ScaffoldCharacterItems
      const scaffoldChars: ScaffoldCharacterItem[] = action.scaffold.suggestedCharacters.map(s => ({
        suggestionId: s.suggestionId,
        suggestedName: s.suggestedName,
        suggestedRole: s.role,
        connectionToCrime: s.connectionToCrime,
        potentialMotive: s.potentialMotive,
        // Pre-fill with suggestions
        name: s.suggestedName,
        role: s.role,
        appearance: '',
        personalityTraits: [],
        secret: '',
        isCulprit: false,
        uploadedImageUrl: null,
        isComplete: false,
      }));

      return {
        ...state,
        scaffoldGenerating: false,
        scaffoldComplete: true,
        scaffold: action.scaffold,
        scaffoldCharacters: scaffoldChars,
      };
    }

    case 'UPDATE_SCAFFOLD':
      if (!state.scaffold) return state;
      return {
        ...state,
        scaffold: { ...state.scaffold, ...action.updates },
      };

    case 'UPDATE_SCAFFOLD_CHARACTER':
      return {
        ...state,
        scaffoldCharacters: state.scaffoldCharacters.map(c =>
          c.suggestionId === action.suggestionId
            ? {
                ...c,
                ...action.updates,
                // Auto-calculate isComplete
                isComplete: Boolean(
                  (action.updates.name ?? c.name)?.trim() &&
                  (action.updates.role ?? c.role)?.trim() &&
                  (action.updates.appearance ?? c.appearance)?.trim() &&
                  ((action.updates.personalityTraits ?? c.personalityTraits)?.length > 0) &&
                  (action.updates.secret ?? c.secret)?.trim()
                ),
              }
            : c
        ),
      };

    case 'SET_CULPRIT':
      return {
        ...state,
        scaffoldCharacters: state.scaffoldCharacters.map(c => ({
          ...c,
          isCulprit: c.suggestionId === action.suggestionId,
        })),
      };

    case 'UPDATE_CRIME_DETAILS':
      return {
        ...state,
        crimeDetails: { ...state.crimeDetails, [action.field]: action.value },
      };

    case 'START_FINAL_GENERATION':
      return { ...state, finalGenerating: true, error: null };

    case 'COMPLETE_FINAL_GENERATION':
      return {
        ...state,
        finalGenerating: false,
        storyId: action.storyId,
        generatedStory: action.story,
        generatedPlotPoints: action.plotPoints,
        minimumPointsToAccuse: action.minPoints,
        perfectScoreThreshold: action.perfectScore,
        cluesComplete: true,
        storyComplete: true,
        // Convert generated characters to legacy format for display
        characters: action.characters.map(gc => ({
          input: {
            tempId: gc.tempId,
            name: gc.name,
            role: gc.role,
            description: gc.appearance.description,
            uploadedImageUrl: gc.imageUrl || null,
            isVictim: gc.isVictim,
            personalityTraits: gc.personality.traits,
            secret: gc.secrets[0]?.content || '',
          },
          generated: gc,
          isGenerating: false,
          isComplete: true,
        })),
      };

    // ========== End Scaffold Flow Actions ==========

    // Characters Stage (Legacy)
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

    // ========== Post-generation editing (Story Bible) ==========
    case 'UPDATE_TIMELINE_EVENT_AT':
      if (!state.generatedStory) return state;
      return {
        ...state,
        generatedStory: {
          ...state.generatedStory,
          actualEvents: state.generatedStory.actualEvents.map((e, i) =>
            i === action.index ? action.value : e
          ),
        },
      };

    case 'ADD_TIMELINE_EVENT_AT':
      if (!state.generatedStory) return state;
      return {
        ...state,
        generatedStory: {
          ...state.generatedStory,
          actualEvents: [
            ...state.generatedStory.actualEvents.slice(0, action.index + 1),
            action.value,
            ...state.generatedStory.actualEvents.slice(action.index + 1),
          ],
        },
      };

    case 'DELETE_TIMELINE_EVENT_AT':
      if (!state.generatedStory) return state;
      return {
        ...state,
        generatedStory: {
          ...state.generatedStory,
          actualEvents: state.generatedStory.actualEvents.filter((_, i) => i !== action.index),
        },
      };

    case 'UPDATE_CHARACTER_KNOWLEDGE': {
      return {
        ...state,
        characters: state.characters.map((c) => {
          if (c.generated?.id !== action.characterId) return c;
          return {
            ...c,
            generated: c.generated ? {
              ...c.generated,
              knowledge: {
                ...c.generated.knowledge,
                [action.field]: action.value,
              },
            } : null,
          };
        }),
      };
    }

    case 'UPDATE_CHARACTER_KNOWS_ABOUT_OTHERS': {
      return {
        ...state,
        characters: state.characters.map((c) => {
          if (c.generated?.id !== action.characterId) return c;
          return {
            ...c,
            generated: c.generated ? {
              ...c.generated,
              knowledge: {
                ...c.generated.knowledge,
                knowsAboutOthers: c.generated.knowledge.knowsAboutOthers.map((item, i) =>
                  i === action.index ? action.value : item
                ),
              },
            } : null,
          };
        }),
      };
    }

    case 'ADD_CHARACTER_KNOWS_ABOUT_OTHERS': {
      return {
        ...state,
        characters: state.characters.map((c) => {
          if (c.generated?.id !== action.characterId) return c;
          return {
            ...c,
            generated: c.generated ? {
              ...c.generated,
              knowledge: {
                ...c.generated.knowledge,
                knowsAboutOthers: [...c.generated.knowledge.knowsAboutOthers, action.value],
              },
            } : null,
          };
        }),
      };
    }

    case 'DELETE_CHARACTER_KNOWS_ABOUT_OTHERS': {
      return {
        ...state,
        characters: state.characters.map((c) => {
          if (c.generated?.id !== action.characterId) return c;
          return {
            ...c,
            generated: c.generated ? {
              ...c.generated,
              knowledge: {
                ...c.generated.knowledge,
                knowsAboutOthers: c.generated.knowledge.knowsAboutOthers.filter((_, i) => i !== action.index),
              },
            } : null,
          };
        }),
      };
    }

    case 'UPDATE_SOLUTION':
      if (!state.generatedStory) return state;
      return {
        ...state,
        generatedStory: {
          ...state.generatedStory,
          solution: {
            ...state.generatedStory.solution,
            [action.field]: action.value,
          },
        },
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
        scaffoldGenerating: false,
        finalGenerating: false,
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

  // Computed helpers (legacy flow)
  canProceedFromStory: boolean;
  canProceedFromCharacters: boolean;
  canProceedFromClues: boolean;
  completedCharacters: UGCGeneratedCharacter[];
  nonVictimCharacters: UGCGeneratedCharacter[];

  // Computed helpers (scaffold flow)
  canProceedFromScaffold: boolean;
  canProceedFromScaffoldCharacters: boolean;
  canGenerateFinal: boolean;
  completedScaffoldCharacters: ScaffoldCharacterItem[];
  selectedCulprit: ScaffoldCharacterItem | null;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, undefined, createInitialState);

  // Computed values (legacy)
  const completedCharacters = state.characters
    .filter((c) => c.isComplete && c.generated)
    .map((c) => c.generated!);

  const nonVictimCharacters = completedCharacters.filter((c) => !c.isVictim);

  const canProceedFromStory = state.storyComplete && state.generatedStory !== null;

  const canProceedFromCharacters = completedCharacters.length >= 3 &&
    !state.characters.some((c) => c.isGenerating);

  const canProceedFromClues = state.cluesComplete && state.generatedPlotPoints !== null;

  // Computed values (scaffold flow)
  const canProceedFromScaffold = state.scaffoldComplete && state.scaffold !== null;

  const completedScaffoldCharacters = state.scaffoldCharacters.filter(c => c.isComplete);

  const canProceedFromScaffoldCharacters = completedScaffoldCharacters.length >= 3;

  const selectedCulprit = state.scaffoldCharacters.find(c => c.isCulprit) || null;

  const canGenerateFinal =
    canProceedFromScaffoldCharacters &&
    selectedCulprit !== null &&
    state.crimeDetails.motive.trim().length > 0 &&
    state.crimeDetails.method.trim().length > 0;

  const value: WizardContextValue = {
    state,
    dispatch,
    canProceedFromStory,
    canProceedFromCharacters,
    canProceedFromClues,
    completedCharacters,
    nonVictimCharacters,
    // Scaffold flow
    canProceedFromScaffold,
    canProceedFromScaffoldCharacters,
    canGenerateFinal,
    completedScaffoldCharacters,
    selectedCulprit,
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
