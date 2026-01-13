/**
 * UGC Types - Type definitions for the structured UGC creation flow
 *
 * Flow: UGCFormInput → LLM Generation → UGCGeneratedData → User Edits → UGCFinalStory
 */

// ============================================================================
// Phase 1: User Form Input
// ============================================================================

/**
 * Character input from the user in Phase 1
 */
export interface UGCCharacterInput {
  /** Temporary ID for form tracking */
  tempId: string;
  /** Character's full name */
  name: string;
  /** Role/occupation (e.g., "The Butler", "Ex-Wife", "Business Partner") */
  role: string;
  /** Brief description for image generation */
  description: string;
  /** User-uploaded image URL or null if should be generated */
  uploadedImageUrl: string | null;
  /** Whether this character is the victim (optional, not all stories have victims) */
  isVictim?: boolean;
  /** Optional personality traits selected by user */
  personalityTraits?: string[];
  /** Optional dark secret provided by user */
  secret?: string;
}

/**
 * Crime/solution input from the user in Phase 1
 */
export interface UGCCrimeInput {
  /** Type of crime (Murder, Theft, Kidnapping, etc.) */
  crimeType: 'murder' | 'theft' | 'kidnapping' | 'fraud' | 'sabotage' | 'other';
  /** ID of the guilty character (references UGCCharacterInput.tempId) */
  culpritId: string;
  /** Why they did it */
  motive: string;
  /** How they did it (the clever method/twist) */
  method: string;
}

/**
 * Complete form input from user in Phase 1
 */
export interface UGCFormInput {
  /** Story title */
  title: string;
  /** Setting location */
  settingLocation: string;
  /** Time period */
  timePeriod: 'modern' | '1990s' | '1920s' | 'victorian' | 'medieval' | 'future' | 'other';
  /** Custom time period if 'other' is selected */
  customTimePeriod?: string;
  /** The hook/premise shown to players */
  premise: string;
  /** Characters (3-5) */
  characters: UGCCharacterInput[];
  /** Crime details */
  crime: UGCCrimeInput;
}

// ============================================================================
// Phase 2: LLM Generated Data
// ============================================================================

/**
 * Generated character data (extends user input with LLM additions)
 */
export interface UGCGeneratedCharacter {
  /** Generated snake_case ID */
  id: string;
  /** Original tempId from form input */
  tempId: string;
  /** Character name (from user) */
  name: string;
  /** Character role (from user) */
  role: string;
  /** Age (generated) */
  age: number;
  /** Whether this is the guilty party */
  isGuilty: boolean;
  /** Whether this is the victim */
  isVictim: boolean;
  /** Personality (generated) */
  personality: {
    traits: string[];
    speechStyle: string;
    quirks: string[];
  };
  /** Appearance */
  appearance: {
    /** User's description */
    description: string;
    /** Generated prompt for AI image */
    imagePrompt: string;
  };
  /** Knowledge (generated) */
  knowledge: {
    knowsAboutCrime: string;
    knowsAboutOthers: string[];
    alibi: string;
  };
  /** Secrets (expanded from user input if provided) */
  secrets: Array<{
    content: string;
    willingnessToReveal: 'low' | 'medium' | 'high' | 'never';
    revealCondition: string;
  }>;
  /** Behavior patterns (generated) */
  behaviorUnderPressure: {
    defensive: string;
    whenCaughtLying: string;
    whenAccused: string;
  };
  /** Relationships to other characters (generated) */
  relationships: Record<string, string>;
  /** Image URL (uploaded or generated) */
  imageUrl?: string;
}

/**
 * Generated plot point/clue
 */
export interface UGCGeneratedPlotPoint {
  id: string;
  category: 'motive' | 'alibi' | 'evidence' | 'relationship';
  description: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  points: number;
  /** Character IDs who can reveal this clue */
  revealedBy: string[];
  /** Keywords for NLP detection during interrogation */
  detectionHints: string[];
}

/**
 * Generated story completion
 */
export interface UGCGeneratedStory {
  /** Story ID */
  id: string;
  /** Title (from user) */
  title: string;
  /** Difficulty (calculated) */
  difficulty: 'easy' | 'medium' | 'hard';
  /** Estimated playtime */
  estimatedMinutes: number;
  /** Setting */
  setting: {
    location: string;
    timePeriod: string;
    atmosphere: string;
  };
  /** Premise (from user, possibly polished) */
  premise: string;
  /** Timeline of actual events (generated) */
  actualEvents: string[];
  /** Solution */
  solution: {
    culprit: string;
    method: string;
    motive: string;
    explanation: string;
  };
}

/**
 * Complete generated data from Phase 2
 */
export interface UGCGeneratedData {
  story: UGCGeneratedStory;
  characters: UGCGeneratedCharacter[];
  plotPoints: {
    plotPoints: UGCGeneratedPlotPoint[];
    minimumPointsToAccuse: number;
    perfectScoreThreshold: number;
  };
}

// ============================================================================
// Phase 3: Draft State (User Edits in Review)
// ============================================================================

/**
 * Editable sections in the review phase
 */
export type EditableSection =
  | 'timeline'
  | 'characterKnowledge'
  | 'characterAlibis'
  | 'relationships'
  | 'clues'
  | 'solution';

/**
 * Draft state tracking user edits in Phase 3
 */
export interface UGCDraftState {
  /** Current story data (merged from generated + edits) */
  story: UGCGeneratedStory;
  /** Current character data (merged from generated + edits) */
  characters: UGCGeneratedCharacter[];
  /** Current plot points (merged from generated + edits) */
  plotPoints: {
    plotPoints: UGCGeneratedPlotPoint[];
    minimumPointsToAccuse: number;
    perfectScoreThreshold: number;
  };
  /** Track which sections have been edited */
  editedSections: Set<EditableSection>;
  /** Track which sections are currently regenerating */
  regeneratingSections: Set<EditableSection>;
}

// ============================================================================
// Phase 4: Final Story (What Gets Saved)
// ============================================================================

/**
 * Final story data structure (matches existing story.json format)
 */
export interface UGCFinalStory {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedMinutes: number;
  setting: {
    location: string;
    timePeriod: string;
    atmosphere: string;
  };
  premise: string;
  actualEvents: string[];
  solution: {
    culprit: string;
    method: string;
    motive: string;
    explanation: string;
  };
}

/**
 * Final character data structure (matches existing characters.json format)
 */
export interface UGCFinalCharacter {
  id: string;
  name: string;
  role: string;
  age: number;
  isGuilty: boolean;
  personality: {
    traits: string[];
    speechStyle: string;
    quirks: string[];
  };
  appearance: {
    description: string;
    imagePrompt: string;
  };
  knowledge: {
    knowsAboutCrime: string;
    knowsAboutOthers: string[];
    alibi: string;
  };
  secrets: Array<{
    content: string;
    willingnessToReveal: 'low' | 'medium' | 'high' | 'never';
    revealCondition: string;
  }>;
  behaviorUnderPressure: {
    defensive: string;
    whenCaughtLying: string;
    whenAccused: string;
  };
  relationships: Record<string, string>;
}

/**
 * Final plot points data structure (matches existing plot-points.json format)
 */
export interface UGCFinalPlotPoints {
  plotPoints: Array<{
    id: string;
    category: 'motive' | 'alibi' | 'evidence' | 'relationship';
    description: string;
    importance: 'low' | 'medium' | 'high' | 'critical';
    points: number;
    revealedBy: string[];
    detectionHints: string[];
  }>;
  minimumPointsToAccuse: number;
  perfectScoreThreshold: number;
}

// ============================================================================
// Observability Types
// ============================================================================

/**
 * Prompt trace for observability - stored in game folder for debugging
 */
export interface PromptTrace {
  timestamp: string;
  step: string;
  prompt: string;
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Request body for /api/ugc/generate
 */
export interface GenerateRequest {
  formInput: UGCFormInput;
}

/**
 * SSE progress event during generation
 */
export interface GenerateProgressEvent {
  type: 'progress';
  step: 'story' | 'characters' | 'plot-points' | 'scene-image' | 'character-images';
  message: string;
  progress: number;
}

/**
 * SSE complete event when generation finishes
 */
export interface GenerateCompleteEvent {
  type: 'complete';
  data: UGCGeneratedData;
}

/**
 * SSE error event
 */
export interface GenerateErrorEvent {
  type: 'error';
  message: string;
}

export type GenerateSSEEvent = GenerateProgressEvent | GenerateCompleteEvent | GenerateErrorEvent;

/**
 * Request body for /api/ugc/regenerate-section
 */
export interface RegenerateSectionRequest {
  section: EditableSection;
  formInput: UGCFormInput;
  currentDraft: UGCDraftState;
}

/**
 * Response from /api/ugc/regenerate-section
 */
export interface RegenerateSectionResponse {
  section: EditableSection;
  data: Partial<UGCGeneratedData>;
}

/**
 * Request body for /api/ugc/save
 */
export interface SaveRequest {
  formInput: UGCFormInput;
  draft: UGCDraftState;
}

/**
 * Response from /api/ugc/save
 */
export interface SaveResponse {
  storyId: string;
  success: boolean;
}

// ============================================================================
// Constants
// ============================================================================

export const TIME_PERIODS = [
  { value: 'modern', label: 'Modern Day' },
  { value: '1990s', label: '1990s' },
  { value: '1920s', label: '1920s (Roaring Twenties)' },
  { value: 'victorian', label: 'Victorian Era' },
  { value: 'medieval', label: 'Medieval' },
  { value: 'future', label: 'Future/Sci-Fi' },
  { value: 'other', label: 'Other (specify)' },
] as const;

export const CRIME_TYPES = [
  { value: 'murder', label: 'Murder' },
  { value: 'theft', label: 'Theft/Heist' },
  { value: 'kidnapping', label: 'Kidnapping' },
  { value: 'fraud', label: 'Fraud/Embezzlement' },
  { value: 'sabotage', label: 'Sabotage' },
  { value: 'other', label: 'Other' },
] as const;

export const PERSONALITY_TRAITS = [
  'ambitious', 'anxious', 'arrogant', 'calculating', 'charming',
  'cold', 'compassionate', 'cunning', 'defensive', 'dramatic',
  'elegant', 'emotional', 'guarded', 'impulsive', 'intelligent',
  'manipulative', 'nervous', 'obsessive', 'paranoid', 'perfectionist',
  'secretive', 'sharp-witted', 'smooth-talking', 'suspicious', 'temperamental',
] as const;

export const MAX_CHARACTERS = 5;
export const MIN_CHARACTERS = 3;
