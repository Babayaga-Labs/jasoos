// LLM Client using OpenAI SDK (compatible with OpenRouter, OpenAI, Azure OpenAI, and Anthropic via OpenRouter)
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
  /** JSON schema for structured outputs - guarantees response matches schema */
  jsonSchema?: {
    name: string;
    schema: Record<string, unknown>;
  };
}

export interface JSONSchema {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
}

export interface GenerateJSONOptions {
  maxTokens?: number;
  temperature?: number;
  schema: JSONSchema;
}

/**
 * Check if the provider supports OpenAI-style structured outputs
 */
function supportsStructuredOutputs(config: LLMConfig): boolean {
  if (config.provider === 'openai') return true;
  if (config.provider === 'azure') return true;
  if (config.provider === 'openrouter') {
    // OpenRouter supports structured outputs for OpenAI models
    return config.defaultModel.includes('openai/');
  }
  return false;
}

/**
 * LLM Client that works with OpenRouter, OpenAI, Azure OpenAI, or any OpenAI-compatible API
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
        'HTTP-Referer': process.env.OPENROUTER_REFERER || process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000',
        'X-Title': process.env.OPENROUTER_TITLE || 'Murder Verse',
      } : undefined,
    });
  }

  private getTokenParam(maxTokens: number): { max_tokens?: number; max_completion_tokens?: number } {
    if (this.config.provider === 'azure') {
      // Azure gpt-5-mini is a reasoning model that uses tokens for internal chain-of-thought.
      // We need to provide extra tokens for reasoning (typically 3-5x the desired output).
      // Cap at 16384 which is the max for this model.
      const reasoningBuffer = Math.max(maxTokens * 4, 2000);
      const total = Math.min(maxTokens + reasoningBuffer, 16384);
      return { max_completion_tokens: total };
    }
    return { max_tokens: maxTokens };
  }

  private getTemperature(temperature: number): number | undefined {
    // Azure gpt-5-mini only supports temperature=1
    if (this.config.provider === 'azure') {
      return undefined;
    }
    return temperature;
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
      ...this.getTokenParam(options.maxTokens || 300),
      temperature: this.getTemperature(options.temperature ?? 0.8),
    });

    const content = response.choices[0]?.message?.content;

    // Debug logging for empty responses
    if (!content) {
      console.warn('[LLM] Empty response from roleplay. Response:', JSON.stringify({
        finishReason: response.choices[0]?.finish_reason,
        message: response.choices[0]?.message,
        model: response.model,
      }, null, 2));
    }

    return {
      content: content || '',
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
      ...this.getTokenParam(options.maxTokens || 2000),
      temperature: this.getTemperature(options.temperature ?? 0.7),
    });

    const content = response.choices[0]?.message?.content;

    // Debug logging for empty responses
    if (!content) {
      console.warn('[LLM] Empty response from generate. Response:', JSON.stringify({
        finishReason: response.choices[0]?.finish_reason,
        message: response.choices[0]?.message,
        model: response.model,
      }, null, 2));
    }

    return {
      content: content || '',
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
      ...this.getTokenParam(options.maxTokens || 2000),
      temperature: this.getTemperature(options.temperature ?? 0.7),
    });

    const content = response.choices[0]?.message?.content;

    // Debug logging for empty responses
    if (!content) {
      console.warn('[LLM] Empty response from chat. Response:', JSON.stringify({
        finishReason: response.choices[0]?.finish_reason,
        message: response.choices[0]?.message,
        model: response.model,
      }, null, 2));
    }

    return {
      content: content || '',
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
      },
    };
  }

  /**
   * Generate a structured JSON response with guaranteed schema compliance
   * Uses OpenAI structured outputs when available, falls back to prompt injection
   */
  async generateJSON<T>(prompt: string, options: GenerateJSONOptions): Promise<T> {
    const model = this.config.defaultModel;

    if (supportsStructuredOutputs(this.config)) {
      // Use native structured outputs - guaranteed valid JSON
      const response = await this.client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        ...this.getTokenParam(options.maxTokens || 2000),
        temperature: this.getTemperature(options.temperature ?? 0.7),
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: options.schema.name,
            schema: options.schema.schema,
            strict: options.schema.strict ?? true,
          },
        },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from LLM with structured outputs');
      }

      // Parse is guaranteed to succeed with structured outputs
      return JSON.parse(content) as T;
    }

    // Fallback: append schema to prompt and parse response
    const schemaPrompt = `${prompt}

IMPORTANT: Respond with ONLY valid JSON matching this schema:
${JSON.stringify(options.schema.schema, null, 2)}`;

    const response = await this.client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: schemaPrompt }],
      ...this.getTokenParam(options.maxTokens || 2000),
      temperature: this.getTemperature(options.temperature ?? 0.7),
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from LLM');
    }

    // Parse and coerce types for safety
    const parsed = this.parseJSONFromText(content);
    return this.coerceToSchema(parsed, options.schema.schema) as T;
  }

  /**
   * Parse JSON from LLM response text, handling common formatting issues
   */
  private parseJSONFromText(text: string): unknown {
    // Try direct parse first
    try {
      return JSON.parse(text);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1].trim());
      }

      // Try to find JSON object/array
      const objectMatch = text.match(/\{[\s\S]*\}/);
      const arrayMatch = text.match(/\[[\s\S]*\]/);

      if (objectMatch) return JSON.parse(objectMatch[0]);
      if (arrayMatch) return JSON.parse(arrayMatch[0]);

      throw new Error('Could not parse JSON from LLM response');
    }
  }

  /**
   * Coerce parsed data to match schema types (handles common LLM errors like object instead of string)
   */
  private coerceToSchema(data: unknown, schema: Record<string, unknown>): unknown {
    if (!data || typeof data !== 'object') return data;

    const schemaType = schema.type as string | undefined;
    const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
    const additionalProperties = schema.additionalProperties as Record<string, unknown> | undefined;

    // Handle objects with additionalProperties (like character knowledge map)
    if (schemaType === 'object' && additionalProperties && !properties) {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        result[key] = this.coerceToSchema(value, additionalProperties);
      }
      return result;
    }

    // Handle objects with defined properties
    if (schemaType === 'object' && properties) {
      const result: Record<string, unknown> = {};
      const dataObj = data as Record<string, unknown>;
      for (const [key, propSchema] of Object.entries(properties)) {
        const value = dataObj[key];
        const propType = propSchema.type as string | undefined;

        if (propType === 'string' && typeof value !== 'string') {
          // Coerce to string if schema expects string
          result[key] = value != null ? String(value) : '';
        } else if (propType === 'array' && !Array.isArray(value)) {
          // Coerce to array
          result[key] = value != null ? [value] : [];
        } else if (propType === 'object' && value && typeof value === 'object') {
          result[key] = this.coerceToSchema(value, propSchema);
        } else {
          result[key] = value;
        }
      }
      return result;
    }

    return data;
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
