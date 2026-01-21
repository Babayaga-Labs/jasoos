'use client';

import React, { createContext, useContext, useReducer } from 'react';
import {
  PERSONALITY_TRAITS,
  type UGCStoryScaffold,
  type UGCFoundationCharacter,
  type UGCFoundation,
  type UGCGeneratedCharacter,
  type UGCGeneratedClue,
  type UGCSolution,
  type FleshOutResponse,
} from '@/packages/ai/types/ugc-types';

// ============================================================================
// Wizard Types
// ============================================================================

export type WizardStage = 'prompt' | 'foundation' | 'characters' | 'clues';

export interface WizardState {
  // Navigation
  currentStage: WizardStage;
  storyId: string | null;

  // Prompt stage
  premise: string;
  scaffoldGenerating: boolean;

  // Foundation stage (from scaffold, editable)
  foundation: UGCFoundation | null;
  foundationCharacters: UGCFoundationCharacter[];
  culpritId: string | null;
  culpritMotive: string;
  culpritMethod: string;

  // Character stage (post-generation)
  generatedCharacters: UGCGeneratedCharacter[];
  charactersGenerating: boolean;
  generationProgress: { step: string; progress: number } | null;
  hasGeneratedOnce: boolean; // tracks if characters were generated (for back nav warning)

  // Clue generation (Characters → Clues transition)
  cluesGenerating: boolean;
  cluesGenerationProgress: { step: string; progress: number } | null;

  // Clue review stage
  clues: UGCGeneratedClue[];
  timeline: string[];
  solution: UGCSolution | null;
  timelineRegenerating: boolean;

  // Timeline/Knowledge generation (Clues → Publish transition)
  timelineKnowledgeGenerating: boolean;
  timelineKnowledgeProgress: { step: string; progress: number } | null;

  // Scoring
  minimumPointsToAccuse: number;
  perfectScoreThreshold: number;

  // Scene/Publish
  sceneImageUrl: string | null;
  sceneGenerating: boolean;
  isPublishing: boolean;
  isPublished: boolean;

  // Tracking for dirty state
  secretsEditedSinceGeneration: boolean;

  // Error handling
  error: string | null;
}

// ============================================================================
// Actions
// ============================================================================

type WizardAction =
  // Navigation
  | { type: 'GO_TO_STAGE'; stage: WizardStage }
  | { type: 'RESET_WIZARD' }

  // Prompt stage
  | { type: 'SET_PREMISE'; premise: string }
  | { type: 'START_SCAFFOLD' }
  | { type: 'COMPLETE_SCAFFOLD'; scaffold: UGCStoryScaffold }

  // Foundation stage - foundation edits
  | { type: 'UPDATE_FOUNDATION_FIELD'; field: keyof Omit<UGCFoundation, 'setting'>; value: string }
  | { type: 'UPDATE_FOUNDATION_SETTING'; field: keyof UGCFoundation['setting']; value: string }

  // Foundation stage - character edits
  | { type: 'UPDATE_FOUNDATION_CHARACTER'; id: string; field: 'name' | 'role' | 'connectionHint'; value: string }
  | { type: 'ADD_FOUNDATION_CHARACTER' }
  | { type: 'DELETE_FOUNDATION_CHARACTER'; id: string }

  // Foundation stage - culprit selection
  | { type: 'SET_CULPRIT'; id: string | null }
  | { type: 'SET_CULPRIT_MOTIVE'; motive: string }
  | { type: 'SET_CULPRIT_METHOD'; method: string }

  // Character generation (Foundation → Characters transition)
  | { type: 'START_GENERATION' }
  | { type: 'UPDATE_GENERATION_PROGRESS'; step: string; progress: number }
  | { type: 'COMPLETE_GENERATION'; result: FleshOutResponse }

  // Character stage edits
  | { type: 'UPDATE_GENERATED_CHARACTER'; id: string; updates: Partial<UGCGeneratedCharacter> }
  | { type: 'START_IMAGE_REGEN'; characterId: string }
  | { type: 'COMPLETE_IMAGE_REGEN'; characterId: string; imageUrl: string }
  | { type: 'SET_CHARACTER_IMAGE'; characterId: string; imageUrl: string }

  // Clue generation (Characters → Clues transition)
  | { type: 'START_CLUES_GEN' }
  | { type: 'UPDATE_CLUES_GEN_PROGRESS'; step: string; progress: number }
  | { type: 'COMPLETE_CLUES_GEN'; clues: UGCGeneratedClue[]; scoring: { minimumPointsToAccuse: number; perfectScoreThreshold: number } }

  // Clue review stage - clue edits
  | { type: 'UPDATE_CLUE'; id: string; updates: Partial<UGCGeneratedClue> }
  | { type: 'ADD_CLUE' }
  | { type: 'DELETE_CLUE'; id: string }

  // Clue review stage - timeline edits
  | { type: 'UPDATE_TIMELINE_EVENT'; index: number; value: string }
  | { type: 'ADD_TIMELINE_EVENT'; afterIndex: number }
  | { type: 'DELETE_TIMELINE_EVENT'; index: number }
  | { type: 'START_TIMELINE_REGEN' }
  | { type: 'COMPLETE_TIMELINE_REGEN'; timeline: string[]; characters?: UGCGeneratedCharacter[] }

  // Timeline/Knowledge generation (Clues → Publish transition)
  | { type: 'START_TIMELINE_KNOWLEDGE_GEN' }
  | { type: 'UPDATE_TIMELINE_KNOWLEDGE_PROGRESS'; step: string; progress: number }
  | { type: 'COMPLETE_TIMELINE_KNOWLEDGE_GEN'; timeline: string[]; characters: UGCGeneratedCharacter[] }

  // Publish
  | { type: 'START_SCENE_GEN' }
  | { type: 'COMPLETE_SCENE_GEN'; imageUrl: string }
  | { type: 'START_PUBLISH' }
  | { type: 'COMPLETE_PUBLISH'; storyId: string }

  // Error
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' };

// ============================================================================
// Initial State
// ============================================================================

function createInitialState(): WizardState {
  return {
    currentStage: 'prompt',
    storyId: null,

    // Prompt
    premise: '',
    scaffoldGenerating: false,

    // Foundation
    foundation: null,
    foundationCharacters: [],
    culpritId: null,
    culpritMotive: '',
    culpritMethod: '',

    // Characters
    generatedCharacters: [],
    charactersGenerating: false,
    generationProgress: null,
    hasGeneratedOnce: false,

    // Clue generation
    cluesGenerating: false,
    cluesGenerationProgress: null,

    // Clues
    clues: [],
    timeline: [],
    solution: null,
    timelineRegenerating: false,

    // Timeline/Knowledge generation
    timelineKnowledgeGenerating: false,
    timelineKnowledgeProgress: null,

    // Scoring
    minimumPointsToAccuse: 50,
    perfectScoreThreshold: 150,

    // Scene/Publish
    sceneImageUrl: null,
    sceneGenerating: false,
    isPublishing: false,
    isPublished: false,

    // Tracking
    secretsEditedSinceGeneration: false,

    // Error
    error: null,
  };
}

// ============================================================================
// Reducer
// ============================================================================

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    // ===================== Navigation =====================
    case 'GO_TO_STAGE':
      return { ...state, currentStage: action.stage, error: null };

    case 'RESET_WIZARD':
      return createInitialState();

    // ===================== Prompt Stage =====================
    case 'SET_PREMISE':
      return { ...state, premise: action.premise };

    case 'START_SCAFFOLD':
      return { ...state, scaffoldGenerating: true, error: null };

    case 'COMPLETE_SCAFFOLD': {
      const scaffold = action.scaffold;
      // Convert scaffold to foundation format
      const foundation: UGCFoundation = {
        title: scaffold.title,
        synopsis: scaffold.synopsis || scaffold.hook || '',
        crimeType: scaffold.crimeType,
        setting: scaffold.setting,
        victimParagraph: scaffold.victimParagraph || scaffold.victimContext || '',
      };
      // Convert suggested characters to foundation characters
      const foundationCharacters: UGCFoundationCharacter[] = scaffold.suggestedCharacters.map(s => ({
        id: s.suggestionId,
        name: s.suggestedName,
        role: s.role,
        connectionHint: s.connectionToCrime,
      }));
      return {
        ...state,
        scaffoldGenerating: false,
        foundation,
        foundationCharacters,
        currentStage: 'foundation',
      };
    }

    // ===================== Foundation Stage - Foundation Edits =====================
    case 'UPDATE_FOUNDATION_FIELD':
      if (!state.foundation) return state;
      return {
        ...state,
        foundation: { ...state.foundation, [action.field]: action.value },
      };

    case 'UPDATE_FOUNDATION_SETTING':
      if (!state.foundation) return state;
      return {
        ...state,
        foundation: {
          ...state.foundation,
          setting: { ...state.foundation.setting, [action.field]: action.value },
        },
      };

    // ===================== Foundation Stage - Character Edits =====================
    case 'UPDATE_FOUNDATION_CHARACTER':
      return {
        ...state,
        foundationCharacters: state.foundationCharacters.map(c =>
          c.id === action.id ? { ...c, [action.field]: action.value } : c
        ),
      };

    case 'ADD_FOUNDATION_CHARACTER': {
      const newId = `char_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newChar: UGCFoundationCharacter = {
        id: newId,
        name: '',
        role: '',
        connectionHint: 'Custom character',
      };
      return {
        ...state,
        foundationCharacters: [newChar, ...state.foundationCharacters],
      };
    }

    case 'DELETE_FOUNDATION_CHARACTER':
      return {
        ...state,
        foundationCharacters: state.foundationCharacters.filter(c => c.id !== action.id),
        // Clear culprit if deleted
        culpritId: state.culpritId === action.id ? null : state.culpritId,
        culpritMotive: state.culpritId === action.id ? '' : state.culpritMotive,
        culpritMethod: state.culpritId === action.id ? '' : state.culpritMethod,
      };

    // ===================== Foundation Stage - Culprit =====================
    case 'SET_CULPRIT':
      return {
        ...state,
        culpritId: action.id,
        // Clear motive/method when changing culprit
        culpritMotive: action.id !== state.culpritId ? '' : state.culpritMotive,
        culpritMethod: action.id !== state.culpritId ? '' : state.culpritMethod,
      };

    case 'SET_CULPRIT_MOTIVE':
      return { ...state, culpritMotive: action.motive };

    case 'SET_CULPRIT_METHOD':
      return { ...state, culpritMethod: action.method };

    // ===================== Character Generation =====================
    case 'START_GENERATION':
      return {
        ...state,
        charactersGenerating: true,
        generationProgress: null,
        error: null,
      };

    case 'UPDATE_GENERATION_PROGRESS':
      return {
        ...state,
        generationProgress: { step: action.step, progress: action.progress },
      };

    case 'COMPLETE_GENERATION':
      return {
        ...state,
        charactersGenerating: false,
        generationProgress: null,
        hasGeneratedOnce: true,
        storyId: action.result.storyId,
        generatedCharacters: action.result.characters,
        clues: action.result.clues,
        timeline: action.result.timeline,
        solution: action.result.solution,
        minimumPointsToAccuse: action.result.scoring.minimumPointsToAccuse,
        perfectScoreThreshold: action.result.scoring.perfectScoreThreshold,
        secretsEditedSinceGeneration: false, // Fresh generation, no edits yet
        currentStage: 'characters',
      };

    // ===================== Character Stage Edits =====================
    case 'UPDATE_GENERATED_CHARACTER': {
      const secretsWereEdited = 'secrets' in action.updates;
      return {
        ...state,
        generatedCharacters: state.generatedCharacters.map(c =>
          c.id === action.id ? { ...c, ...action.updates } : c
        ),
        // Track if secrets were edited since last generation
        secretsEditedSinceGeneration: secretsWereEdited
          ? true
          : state.secretsEditedSinceGeneration,
      };
    }

    case 'START_IMAGE_REGEN':
      return {
        ...state,
        generatedCharacters: state.generatedCharacters.map(c =>
          c.id === action.characterId ? { ...c, imageGenerating: true } : c
        ),
      };

    case 'COMPLETE_IMAGE_REGEN':
      return {
        ...state,
        generatedCharacters: state.generatedCharacters.map(c =>
          c.id === action.characterId
            ? { ...c, imageUrl: action.imageUrl, imageGenerating: false }
            : c
        ),
      };

    case 'SET_CHARACTER_IMAGE':
      return {
        ...state,
        generatedCharacters: state.generatedCharacters.map(c =>
          c.id === action.characterId ? { ...c, imageUrl: action.imageUrl } : c
        ),
      };

    // ===================== Clue Generation (Characters → Clues) =====================
    case 'START_CLUES_GEN':
      return {
        ...state,
        cluesGenerating: true,
        cluesGenerationProgress: null,
        error: null,
      };

    case 'UPDATE_CLUES_GEN_PROGRESS':
      return {
        ...state,
        cluesGenerationProgress: { step: action.step, progress: action.progress },
      };

    case 'COMPLETE_CLUES_GEN':
      return {
        ...state,
        cluesGenerating: false,
        cluesGenerationProgress: null,
        clues: action.clues,
        minimumPointsToAccuse: action.scoring.minimumPointsToAccuse,
        perfectScoreThreshold: action.scoring.perfectScoreThreshold,
        currentStage: 'clues',
      };

    // ===================== Clue Review Stage - Clue Edits =====================
    case 'UPDATE_CLUE':
      return {
        ...state,
        clues: state.clues.map(c =>
          c.id === action.id ? { ...c, ...action.updates } : c
        ),
      };

    case 'ADD_CLUE': {
      const newClueId = `clue_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newClue: UGCGeneratedClue = {
        id: newClueId,
        description: '',
        points: 10,
        revealedBy: [],
        detectionHints: [],
      };
      return {
        ...state,
        clues: [newClue, ...state.clues],
      };
    }

    case 'DELETE_CLUE':
      return {
        ...state,
        clues: state.clues.filter(c => c.id !== action.id),
      };

    // ===================== Clue Review Stage - Timeline Edits =====================
    case 'UPDATE_TIMELINE_EVENT':
      return {
        ...state,
        timeline: state.timeline.map((e, i) =>
          i === action.index ? action.value : e
        ),
      };

    case 'ADD_TIMELINE_EVENT': {
      const newTimeline = [...state.timeline];
      newTimeline.splice(action.afterIndex + 1, 0, '');
      return { ...state, timeline: newTimeline };
    }

    case 'DELETE_TIMELINE_EVENT':
      return {
        ...state,
        timeline: state.timeline.filter((_, i) => i !== action.index),
      };

    case 'START_TIMELINE_REGEN':
      return { ...state, timelineRegenerating: true, error: null };

    case 'COMPLETE_TIMELINE_REGEN':
      return {
        ...state,
        timelineRegenerating: false,
        timeline: action.timeline,
        // Update characters with aligned knowledge if provided
        generatedCharacters: action.characters || state.generatedCharacters,
        secretsEditedSinceGeneration: false, // Reset since timeline now reflects secrets
      };

    // ===================== Timeline/Knowledge Generation (Clues → Publish) =====================
    case 'START_TIMELINE_KNOWLEDGE_GEN':
      return {
        ...state,
        timelineKnowledgeGenerating: true,
        timelineKnowledgeProgress: null,
        error: null,
      };

    case 'UPDATE_TIMELINE_KNOWLEDGE_PROGRESS':
      return {
        ...state,
        timelineKnowledgeProgress: { step: action.step, progress: action.progress },
      };

    case 'COMPLETE_TIMELINE_KNOWLEDGE_GEN':
      return {
        ...state,
        timelineKnowledgeGenerating: false,
        timelineKnowledgeProgress: null,
        timeline: action.timeline,
        generatedCharacters: action.characters,
        secretsEditedSinceGeneration: false,
      };

    // ===================== Publish =====================
    case 'START_SCENE_GEN':
      return { ...state, sceneGenerating: true, error: null };

    case 'COMPLETE_SCENE_GEN':
      return {
        ...state,
        sceneGenerating: false,
        sceneImageUrl: action.imageUrl,
      };

    case 'START_PUBLISH':
      return { ...state, isPublishing: true, error: null };

    case 'COMPLETE_PUBLISH':
      return {
        ...state,
        isPublishing: false,
        isPublished: true,
        storyId: action.storyId,
      };

    // ===================== Error Handling =====================
    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
        scaffoldGenerating: false,
        charactersGenerating: false,
        cluesGenerating: false,
        timelineRegenerating: false,
        timelineKnowledgeGenerating: false,
        sceneGenerating: false,
        isPublishing: false,
        generationProgress: null,
        cluesGenerationProgress: null,
        timelineKnowledgeProgress: null,
      };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

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
  canGenerateScaffold: boolean;
  canProceedFromFoundation: boolean;
  canProceedFromCharacters: boolean;
  canPublish: boolean;

  // Unified loading state (for major generation operations)
  isAnyGenerating: boolean;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, undefined, createInitialState);

  // Can generate scaffold? (premise must be non-empty)
  const canGenerateScaffold = state.premise.trim().length > 0;

  // Can proceed from Foundation?
  // - Foundation exists
  // - At least 3 characters with names
  // - Culprit selected with motive and method
  const canProceedFromFoundation =
    state.foundation !== null &&
    state.foundationCharacters.length >= 3 &&
    state.foundationCharacters.every(c => c.name.trim().length > 0) &&
    state.culpritId !== null &&
    state.culpritMotive.trim().length > 0 &&
    state.culpritMethod.trim().length > 0;

  // Can proceed from Characters?
  // - Has generated characters
  // - Not currently generating
  // - Each character has at least 1 personality trait selected
  const allCharactersHaveTraits = state.generatedCharacters.every(char => {
    const validTraits = char.personality.traits.filter(t =>
      (PERSONALITY_TRAITS as readonly string[]).includes(t.toLowerCase())
    );
    return validTraits.length >= 1;
  });

  const canProceedFromCharacters =
    state.generatedCharacters.length >= 3 &&
    !state.charactersGenerating &&
    allCharactersHaveTraits;

  // Can publish?
  // - Has clues
  // - Has solution
  // Note: Timeline is generated when "Review & Publish" is clicked, so it's not a prerequisite
  const canPublish =
    state.clues.length > 0 &&
    state.solution !== null &&
    !state.isPublishing;

  // Unified loading state for major generation operations
  // NOT including: timelineRegenerating (small operation), per-character image regen
  // NOT including: timelineKnowledgeGenerating (CluesStage handles its own loading UI and needs to stay mounted for modal)
  const isAnyGenerating =
    state.scaffoldGenerating ||        // Prompt → Foundation
    state.charactersGenerating ||      // Foundation → Characters
    state.cluesGenerating;             // Characters → Clues

  const value: WizardContextValue = {
    state,
    dispatch,
    canGenerateScaffold,
    canProceedFromFoundation,
    canProceedFromCharacters,
    canPublish,
    isAnyGenerating,
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
