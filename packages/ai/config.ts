// AI Provider Configuration
// Supports multiple LLM and image generation providers

export type LLMProvider = 'anthropic' | 'openai' | 'openrouter';
export type ImageProvider = 'replicate' | 'fal' | 'openai';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  baseUrl?: string; // For OpenRouter or custom endpoints
  defaultModel: string;
  roleplayModel?: string; // Model optimized for character roleplay
  judgeModel?: string; // Cheaper model for plot point detection
}

export interface ImageConfig {
  provider: ImageProvider;
  apiKey: string;
  baseUrl?: string;
  defaultModel: string;
  portraitModel?: string; // Model for character portraits
  sceneModel?: string; // Model for scene backgrounds
}

export interface AIConfig {
  llm: LLMConfig;
  image: ImageConfig;
}

// Model mappings for each provider
export const LLM_MODELS: Record<LLMProvider, { roleplay: string; judge: string }> = {
  anthropic: {
    roleplay: 'claude-sonnet-4-20250514',
    judge: 'claude-3-haiku-20240307'
  },
  openai: {
    roleplay: 'gpt-4o',
    judge: 'gpt-4o-mini'
  },
  openrouter: {
    roleplay: 'anthropic/claude-sonnet-4-20250514',
    judge: 'anthropic/claude-3-haiku-20240307'
  }
};

export const IMAGE_MODELS: Record<ImageProvider, { portrait: string; scene: string }> = {
  replicate: {
    portrait: 'black-forest-labs/flux-schnell',
    scene: 'black-forest-labs/flux-schnell'
  },
  fal: {
    portrait: 'fal-ai/flux/schnell',
    scene: 'fal-ai/flux/schnell'
  },
  openai: {
    portrait: 'dall-e-3',
    scene: 'dall-e-3'
  }
};

// Load config from environment variables
export function loadAIConfig(): AIConfig {
  const llmProvider = (process.env.LLM_PROVIDER || 'openrouter') as LLMProvider;
  const imageProvider = (process.env.IMAGE_PROVIDER || 'replicate') as ImageProvider;

  return {
    llm: {
      provider: llmProvider,
      apiKey: process.env.LLM_API_KEY || '',
      baseUrl: process.env.LLM_BASE_URL || getDefaultBaseUrl(llmProvider),
      defaultModel: process.env.LLM_MODEL || LLM_MODELS[llmProvider].roleplay,
      roleplayModel: process.env.LLM_ROLEPLAY_MODEL || LLM_MODELS[llmProvider].roleplay,
      judgeModel: process.env.LLM_JUDGE_MODEL || LLM_MODELS[llmProvider].judge
    },
    image: {
      provider: imageProvider,
      apiKey: process.env.IMAGE_API_KEY || '',
      baseUrl: process.env.IMAGE_BASE_URL,
      defaultModel: process.env.IMAGE_MODEL || IMAGE_MODELS[imageProvider].portrait,
      portraitModel: process.env.IMAGE_PORTRAIT_MODEL || IMAGE_MODELS[imageProvider].portrait,
      sceneModel: process.env.IMAGE_SCENE_MODEL || IMAGE_MODELS[imageProvider].scene
    }
  };
}

function getDefaultBaseUrl(provider: LLMProvider): string | undefined {
  switch (provider) {
    case 'openrouter':
      return 'https://openrouter.ai/api/v1';
    case 'anthropic':
      return 'https://api.anthropic.com';
    case 'openai':
      return 'https://api.openai.com/v1';
    default:
      return undefined;
  }
}
