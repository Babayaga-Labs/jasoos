// AI Package - LLM client, UGC engine, and image generation

// Configuration
export { loadAIConfig } from './config';
export type { AIConfig, LLMConfig, ImageConfig, LLMProvider, ImageProvider } from './config';

// LLM client (OpenAI SDK compatible with OpenRouter)
export { LLMClient, generateText } from './llm-client';
export type { ChatMessage, LLMResponse, GenerateOptions } from './llm-client';

// UGC Engine - Story and character generation
export { StoryGenerator } from './story-generator';
export { CharacterAgent } from './character-agent';
export { UGCEngine } from './ugc-engine';
export type {
  GenerationStep,
  GenerationProgress,
  GenerationResult,
  StructuredGenerationResult,
  StoryData,
  CharacterData,
  PlotPointData,
  PlotPointsData,
  PromptTrace,
} from './ugc-engine';

// UGC Types - Structured input/output types
export type {
  // Legacy/current types
  UGCFormInput,
  UGCCharacterInput,
  UGCCrimeInput,
  UGCGeneratedData,
  UGCGeneratedStory,
  UGCGeneratedCharacter,
  UGCGeneratedPlotPoint,
  UGCDraftState,
  UGCFinalStory,
  UGCFinalCharacter,
  UGCFinalPlotPoints,
  EditableSection,
  GenerateRequest,
  GenerateProgressEvent,
  GenerateCompleteEvent,
  GenerateErrorEvent,
  GenerateSSEEvent,
  RegenerateSectionRequest,
  RegenerateSectionResponse,
  SaveRequest,
  SaveResponse,
  // NEW: Scaffold-based types (character-driven flow)
  UGCStoryScaffold,
  UGCCharacterSuggestion,
  UGCCharacterFromScaffold,
  UGCScaffoldFormInput,
  UGCGeneratedTimeline,
  UGCGeneratedCharacterKnowledge,
  GenerateScaffoldRequest,
  GenerateScaffoldResponse,
  GenerateFromScaffoldRequest,
  ScaffoldGenerateProgressEvent,
  ScaffoldGenerateCompleteEvent,
  ScaffoldGenerateSSEEvent,
} from './types/ugc-types';
export {
  TIME_PERIODS,
  CRIME_TYPES,
  PERSONALITY_TRAITS,
  MAX_CHARACTERS,
  MIN_CHARACTERS,
} from './types/ugc-types';

// Image generation
export { ImageClient } from './image-client';
export type { ImageGenerationOptions, ImageResult } from './image-client';
export { ImageGenerator } from './image-generator';

// UGC Validation
export {
  validateStoryConsistency,
  validateClueRevealers,
  validateClueKnowledgeAlignment,
  validateKnowledgeCoherence,
  validateSolvability,
  validateCulpritAlibi,
} from './ugc-validation';
export type { ValidationWarning, ValidationResult } from './ugc-validation';
