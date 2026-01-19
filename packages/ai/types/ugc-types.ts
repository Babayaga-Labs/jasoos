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
// NEW FLOW: Scaffold-Based Generation (Character-Driven)
// ============================================================================

/**
 * Character suggestion from scaffold - minimal, for user to expand
 */
export interface UGCCharacterSuggestion {
  /** Suggested ID for tracking */
  suggestionId: string;
  /** Suggested name (user can change) */
  suggestedName: string;
  /** Role/archetype */
  role: string;
  /** Why they're connected to the crime */
  connectionToCrime: string;
  /** Hint at possible motive (vague) */
  potentialMotive: string;
}

/**
 * Generated scaffold from initial premise (LLM Call 1)
 */
export interface UGCStoryScaffold {
  /** Generated story title */
  title: string;
  /** Polished synopsis/premise for display */
  synopsis: string;
  /** @deprecated Use synopsis instead */
  hook?: string;
  /** Inferred crime type */
  crimeType: 'murder' | 'theft' | 'kidnapping' | 'fraud' | 'sabotage' | 'other';
  /** Setting details */
  setting: {
    location: string;
    timePeriod: string;
    atmosphere: string;
  };
  /** Suggested characters - user can modify/replace */
  suggestedCharacters: UGCCharacterSuggestion[];
  /** Victim paragraph - detailed description of the victim */
  victimParagraph: string;
  /** @deprecated Use victimParagraph instead */
  victimContext?: string;
}

/**
 * User's filled character based on scaffold (Phase 2 - user fills this)
 */
export interface UGCCharacterFromScaffold {
  /** Links to original suggestion (or null if user-added) */
  fromSuggestionId: string | null;
  /** Temp ID for form tracking */
  tempId: string;
  /** Finalized name */
  name: string;
  /** Finalized role */
  role: string;
  /** Appearance description */
  appearance: string;
  /** Personality traits */
  personalityTraits: string[];
  /** The character's secret - CRITICAL for timeline coherence */
  secret: string;
  /** Is this the culprit? */
  isCulprit: boolean;
  /** Optional uploaded image */
  uploadedImageUrl: string | null;
}

/**
 * New form input for scaffold-based flow
 */
export interface UGCScaffoldFormInput {
  /** User's initial premise */
  initialPremise: string;
  /** Generated scaffold (from LLM Call 1) */
  scaffold: UGCStoryScaffold;
  /** User-filled characters based on scaffold */
  characters: UGCCharacterFromScaffold[];
  /** Crime details (user fills after picking culprit) */
  crimeDetails: {
    /** Why the culprit did it */
    motive: string;
    /** How they did it (the clever method/twist) */
    method: string;
  };
}

/**
 * Generated timeline from character details (LLM Call 2)
 */
export interface UGCGeneratedTimeline {
  /** Chronological events (8-12 timestamped) */
  actualEvents: string[];
  /** Solution derived from timeline */
  solution: {
    culprit: string;
    method: string;
    motive: string;
    explanation: string;
  };
}

/**
 * Generated character knowledge from timeline (LLM Call 4)
 */
export interface UGCGeneratedCharacterKnowledge {
  /** Character ID this knowledge belongs to */
  characterId: string;
  /** What they directly witnessed */
  knowsAboutCrime: string;
  /** Info about other characters */
  knowsAboutOthers: string[];
  /** Their alibi (FALSE for culprit) */
  alibi: string;
  /** Third-person statement for player display */
  statement: string;
  /** Behavior patterns */
  behaviorUnderPressure: {
    defensive: string;
    whenCaughtLying: string;
    whenAccused: string;
  };
}

// ============================================================================
// NEW FLOW v2: Foundation-Based Generation (UGC Pipeline Redesign)
// ============================================================================

/**
 * Minimal character for foundation stage - user fills name/role, AI provides connection hint
 */
export interface UGCFoundationCharacter {
  /** Unique ID for tracking */
  id: string;
  /** Character name (editable by user) */
  name: string;
  /** Character role (editable by user) */
  role: string;
  /** Connection to the crime - generated by AI, read-only for user */
  connectionHint: string;
}

/**
 * Foundation data - the story basics that user can edit
 */
export interface UGCFoundation {
  /** Story title */
  title: string;
  /** Synopsis/premise */
  synopsis: string;
  /** Crime type */
  crimeType: 'murder' | 'theft' | 'kidnapping' | 'fraud' | 'sabotage' | 'other';
  /** Setting details */
  setting: {
    location: string;
    timePeriod: string;
    atmosphere: string;
  };
  /** Victim description paragraph */
  victimParagraph: string;
}

/**
 * Culprit information from foundation stage
 */
export interface CulpritInfo {
  /** ID of the culprit character */
  characterId: string;
  /** Why they did it */
  motive: string;
  /** How they did it */
  method: string;
}

/**
 * Request body for /api/ugc/flesh-out
 * Takes minimal foundation data and generates full characters, clues, and timeline
 */
export interface FleshOutRequest {
  /** The foundation data (title, synopsis, setting, victim) */
  foundation: UGCFoundation;
  /** Minimal character data from foundation stage */
  characters: UGCFoundationCharacter[];
  /** Culprit information */
  culprit: CulpritInfo;
}

/**
 * Simplified clue without categories (for new flow)
 */
export interface UGCGeneratedClue {
  /** Unique ID */
  id: string;
  /** What the player learns */
  description: string;
  /** Point value (10-30) */
  points: number;
  /** Character IDs who can reveal this clue */
  revealedBy: string[];
  /** Keywords for NLP detection during interrogation */
  detectionHints: string[];
}

/**
 * Solution details
 */
export interface UGCSolution {
  /** Name of the culprit */
  culprit: string;
  /** How they did it */
  method: string;
  /** Why they did it */
  motive: string;
  /** Full explanation for the reveal */
  explanation: string;
}

/**
 * Response from /api/ugc/flesh-out
 */
export interface FleshOutResponse {
  /** Generated story ID */
  storyId: string;
  /** Fully generated characters with images */
  characters: UGCGeneratedCharacter[];
  /** Generated clues (no categories) */
  clues: UGCGeneratedClue[];
  /** Generated timeline events */
  timeline: string[];
  /** Solution details */
  solution: UGCSolution;
  /** Scoring thresholds */
  scoring: {
    minimumPointsToAccuse: number;
    perfectScoreThreshold: number;
  };
}

/**
 * SSE progress event for flesh-out generation
 */
export interface FleshOutProgressEvent {
  type: 'progress';
  step: 'characters' | 'timeline' | 'clues' | 'knowledge' | 'images';
  message: string;
  /** Progress percentage 0-100 */
  progress: number;
}

/**
 * SSE complete event for flesh-out generation
 */
export interface FleshOutCompleteEvent {
  type: 'complete';
  data: FleshOutResponse;
}

/**
 * SSE event types for flesh-out generation
 */
export type FleshOutSSEEvent =
  | FleshOutProgressEvent
  | FleshOutCompleteEvent
  | GenerateErrorEvent;

/**
 * Request body for /api/ugc/regenerate-timeline
 * Regenerates timeline based on edited clues
 */
export interface RegenerateTimelineRequest {
  /** Current clues (may have been edited by user) */
  clues: UGCGeneratedClue[];
  /** Current characters */
  characters: UGCGeneratedCharacter[];
  /** Solution details */
  solution: UGCSolution;
  /** Story setting for context */
  setting: {
    location: string;
    timePeriod: string;
    atmosphere: string;
  };
}

/**
 * Response from /api/ugc/regenerate-timeline
 * Now includes updated characters with knowledge aligned to clues
 */
export interface RegenerateTimelineResponse {
  /** Regenerated timeline events */
  timeline: string[];
  /** Updated characters with knowledge aligned to clues and timeline */
  characters: UGCGeneratedCharacter[];
}

/**
 * Request body for /api/ugc/regenerate-image
 */
export interface RegenerateImageRequest {
  /** Character ID to regenerate image for */
  characterId: string;
  /** Appearance description to use for generation */
  appearanceDescription: string;
  /** Story setting for context */
  setting: {
    location: string;
    timePeriod: string;
  };
}

/**
 * Response from /api/ugc/regenerate-image
 */
export interface RegenerateImageResponse {
  /** New image URL */
  imageUrl: string;
}

// ============================================================================
// Phase 2: LLM Generated Data (Legacy - keeping for backward compatibility)
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
  /** Knowledge (generated - internal, not shown to player) */
  knowledge: {
    knowsAboutCrime: string;
    knowsAboutOthers: string[];
    alibi: string;
  };
  /** Third-person case summary shown to player (like detective notes) */
  statement: string;
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
  /** Third-person case summary shown to player (like detective notes) */
  statement: string;
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
 * Request body for /api/ugc/generate-scaffold (NEW)
 */
export interface GenerateScaffoldRequest {
  /** User's initial premise (1-3 sentences) */
  premise: string;
}

/**
 * Response from /api/ugc/generate-scaffold (NEW)
 */
export interface GenerateScaffoldResponse {
  scaffold: UGCStoryScaffold;
}

/**
 * Request body for /api/ugc/generate (NEW FLOW)
 */
export interface GenerateFromScaffoldRequest {
  formInput: UGCScaffoldFormInput;
}

/**
 * SSE progress event for new flow generation
 */
export interface ScaffoldGenerateProgressEvent {
  type: 'progress';
  step: 'timeline' | 'plot-points' | 'character-knowledge' | 'images';
  message: string;
  progress: number;
}

/**
 * SSE complete event for new flow generation
 */
export interface ScaffoldGenerateCompleteEvent {
  type: 'complete';
  storyId: string;
  data: UGCGeneratedData;
  promptTraces?: PromptTrace[];
}

export type ScaffoldGenerateSSEEvent =
  | ScaffoldGenerateProgressEvent
  | ScaffoldGenerateCompleteEvent
  | GenerateErrorEvent;

/**
 * Request body for /api/ugc/generate (LEGACY)
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
