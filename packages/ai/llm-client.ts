// LLM Client using OpenAI SDK (compatible with OpenRouter, OpenAI, and Anthropic via OpenRouter)
import OpenAI from 'openai';
import type { LLMConfig } from './config';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface GenerateOptions {
  maxTokens?: number;
  temperature?: number;
}

/**
 * LLM Client that works with OpenRouter, OpenAI, or any OpenAI-compatible API
 */
export class LLMClient {
  private client: OpenAI;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      defaultHeaders: config.provider === 'openrouter' ? {
        'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://localhost:3000',
        'X-Title': process.env.OPENROUTER_TITLE || 'Jhakaas Jasoos',
      } : undefined,
    });
  }

  /**
   * Generate a completion for roleplay/character conversations
   */
  async roleplay(
    systemPrompt: string,
    messages: ChatMessage[],
    options: GenerateOptions = {}
  ): Promise<LLMResponse> {
    const model = this.config.roleplayModel || this.config.defaultModel;

    const response = await this.client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      max_tokens: options.maxTokens || 300,
      temperature: options.temperature ?? 0.8,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
      },
    };
  }

  /**
   * Generate a completion for content generation (story, characters, etc.)
   */
  async generate(
    prompt: string,
    options: GenerateOptions = {}
  ): Promise<LLMResponse> {
    const model = this.config.defaultModel;

    const response = await this.client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature ?? 0.7,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
      },
    };
  }

  /**
   * Generate with a system prompt and messages
   */
  async chat(
    systemPrompt: string,
    messages: ChatMessage[],
    options: GenerateOptions = {}
  ): Promise<LLMResponse> {
    const model = this.config.defaultModel;

    const response = await this.client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature ?? 0.7,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
      },
    };
  }
}

// Convenience function for simple text generation
export async function generateText(options: {
  config: LLMConfig;
  prompt?: string;
  messages?: ChatMessage[];
  system?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<{ text: string; model: string; usage: { promptTokens: number; completionTokens: number } }> {
  const client = new LLMClient(options.config);

  if (options.messages && options.system) {
    const response = await client.chat(options.system, options.messages, {
      maxTokens: options.maxTokens,
      temperature: options.temperature,
    });
    return { text: response.content, model: response.model, usage: response.usage };
  }

  if (options.prompt) {
    const response = await client.generate(options.prompt, {
      maxTokens: options.maxTokens,
      temperature: options.temperature,
    });
    return { text: response.content, model: response.model, usage: response.usage };
  }

  throw new Error('Either prompt or messages must be provided');
}
