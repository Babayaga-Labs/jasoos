// AI Package - LLM and image generation clients

// Configuration
export { loadAIConfig } from './config';
export type { AIConfig, LLMConfig, ImageConfig, LLMProvider, ImageProvider } from './config';

// Low-level clients (for custom usage)
export { LLMClient } from './llm-client';
export type { ChatMessage, LLMResponse } from './llm-client';
export { ImageClient } from './image-client';
export type { ImageGenerationOptions, ImageResult } from './image-client';

// High-level abstractions
export { CharacterAgent } from './character-agent';
export { StoryGenerator } from './story-generator';
export { ImageGenerator } from './image-generator';

// UGC Generation & Validation
export { UGCEngine } from './ugc-engine';
export type { GenerationProgress } from './ugc-engine';
export { validateFoundationStory } from './ugc-validation';
export type { ValidationResult, ValidationWarning } from './ugc-validation';

// UGC Types & Constants
export { MIN_CHARACTERS, MAX_CHARACTERS } from './types/ugc-types';
export type {
  UGCFormInput,
  UGCDraftState,
  EditableSection,
  PromptTrace,
  RegenerateSectionResponse,
} from './types/ugc-types';
