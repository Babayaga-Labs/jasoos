// Unified LLM Client - works with Anthropic, OpenAI, and OpenRouter
import type { LLMConfig, LLMProvider } from './config';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export class LLMClient {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  /**
   * Send a chat completion request
   * Works with all providers through OpenAI-compatible API
   */
  async chat(
    messages: ChatMessage[],
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ): Promise<LLMResponse> {
    const model = options?.model || this.config.defaultModel;
    const maxTokens = options?.maxTokens || 500;
    const temperature = options?.temperature ?? 0.7;

    // Build messages array with system prompt if provided
    const allMessages: ChatMessage[] = options?.systemPrompt
      ? [{ role: 'system', content: options.systemPrompt }, ...messages]
      : messages;

    if (this.config.provider === 'anthropic') {
      return this.chatAnthropic(allMessages, model, maxTokens, temperature);
    } else {
      // OpenAI and OpenRouter use OpenAI-compatible API
      return this.chatOpenAICompatible(allMessages, model, maxTokens, temperature);
    }
  }

  /**
   * Anthropic API (different format)
   */
  private async chatAnthropic(
    messages: ChatMessage[],
    model: string,
    maxTokens: number,
    temperature: number
  ): Promise<LLMResponse> {
    // Extract system message if present
    const systemMessage = messages.find(m => m.role === 'system');
    const chatMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch(`${this.config.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemMessage?.content,
        messages: chatMessages.map(m => ({
          role: m.role,
          content: m.content
        }))
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      content: data.content[0]?.text || '',
      model: data.model,
      usage: {
        inputTokens: data.usage?.input_tokens || 0,
        outputTokens: data.usage?.output_tokens || 0
      }
    };
  }

  /**
   * OpenAI-compatible API (works with OpenAI and OpenRouter)
   */
  private async chatOpenAICompatible(
    messages: ChatMessage[],
    model: string,
    maxTokens: number,
    temperature: number
  ): Promise<LLMResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`
    };

    // OpenRouter requires additional headers
    if (this.config.provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://jhakaas-jasoos.app';
      headers['X-Title'] = 'Jhakaas Jasoos';
    }

    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        max_tokens: maxTokens,
        temperature
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`${this.config.provider} API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0
      }
    };
  }

  /**
   * Helper for roleplay (uses roleplay model)
   */
  async roleplay(
    systemPrompt: string,
    messages: ChatMessage[],
    options?: { maxTokens?: number; temperature?: number }
  ): Promise<LLMResponse> {
    return this.chat(messages, {
      model: this.config.roleplayModel,
      systemPrompt,
      maxTokens: options?.maxTokens || 300,
      temperature: options?.temperature ?? 0.8
    });
  }

  /**
   * Helper for judging/evaluation (uses cheaper judge model)
   */
  async judge(
    systemPrompt: string,
    content: string,
    options?: { maxTokens?: number }
  ): Promise<LLMResponse> {
    return this.chat(
      [{ role: 'user', content }],
      {
        model: this.config.judgeModel,
        systemPrompt,
        maxTokens: options?.maxTokens || 200,
        temperature: 0.1 // Low temperature for consistent judging
      }
    );
  }
}
