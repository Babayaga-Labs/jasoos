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
  StoryData,
  CharacterData,
  PlotPointData,
  PlotPointsData,
} from './ugc-engine';

// Image generation
export { ImageClient } from './image-client';
export type { ImageGenerationOptions, ImageResult } from './image-client';
export { ImageGenerator } from './image-generator';
