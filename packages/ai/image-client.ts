// Unified Image Generation Client - works with Replicate, Fal.ai, and OpenAI
import type { ImageConfig, ImageProvider } from './config';

export interface ImageGenerationOptions {
  model?: string;
  width?: number;
  height?: number;
  numImages?: number;
}

export interface ImageResult {
  url: string;
  model: string;
}

export class ImageClient {
  private config: ImageConfig;

  constructor(config: ImageConfig) {
    this.config = config;
  }

  /**
   * Generate an image from a prompt
   */
  async generate(
    prompt: string,
    options?: ImageGenerationOptions
  ): Promise<ImageResult> {
    const model = options?.model || this.config.defaultModel;

    switch (this.config.provider) {
      case 'replicate':
        return this.generateReplicate(prompt, model, options);
      case 'fal':
        return this.generateFal(prompt, model, options);
      case 'openai':
        return this.generateOpenAI(prompt, model, options);
      default:
        throw new Error(`Unknown image provider: ${this.config.provider}`);
    }
  }

  /**
   * Generate a character portrait (optimized settings)
   */
  async generatePortrait(prompt: string): Promise<ImageResult> {
    const portraitPrompt = `${prompt}, portrait photography style, centered face, dramatic lighting, high quality`;
    return this.generate(portraitPrompt, {
      model: this.config.portraitModel,
      width: 512,
      height: 768 // Portrait aspect ratio
    });
  }

  /**
   * Generate a scene background (optimized settings)
   */
  async generateScene(prompt: string): Promise<ImageResult> {
    const scenePrompt = `${prompt}, wide angle, atmospheric, cinematic, detailed environment`;
    return this.generate(scenePrompt, {
      model: this.config.sceneModel,
      width: 1280,
      height: 720 // Landscape aspect ratio
    });
  }

  /**
   * Replicate API
   */
  private async generateReplicate(
    prompt: string,
    model: string,
    options?: ImageGenerationOptions
  ): Promise<ImageResult> {
    // Start prediction
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model,
        input: {
          prompt,
          width: options?.width || 1024,
          height: options?.height || 1024,
          num_outputs: options?.numImages || 1
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Replicate API error: ${response.status} - ${error}`);
    }

    const prediction = await response.json();

    // Poll for completion
    const result = await this.pollReplicate(prediction.id);
    return {
      url: result.output[0],
      model
    };
  }

  private async pollReplicate(predictionId: string, maxAttempts = 60): Promise<any> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiKey}`
          }
        }
      );

      const prediction = await response.json();

      if (prediction.status === 'succeeded') {
        return prediction;
      } else if (prediction.status === 'failed') {
        throw new Error(`Replicate prediction failed: ${prediction.error}`);
      }

      // Wait 1 second before polling again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error('Replicate prediction timed out');
  }

  /**
   * Fal.ai API
   */
  private async generateFal(
    prompt: string,
    model: string,
    options?: ImageGenerationOptions
  ): Promise<ImageResult> {
    const baseUrl = this.config.baseUrl || 'https://fal.run';

    const response = await fetch(`${baseUrl}/${model}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${this.config.apiKey}`
      },
      body: JSON.stringify({
        prompt,
        image_size: {
          width: options?.width || 1024,
          height: options?.height || 1024
        },
        num_images: options?.numImages || 1
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Fal.ai API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      url: data.images[0]?.url,
      model
    };
  }

  /**
   * OpenAI DALL-E API
   */
  private async generateOpenAI(
    prompt: string,
    model: string,
    options?: ImageGenerationOptions
  ): Promise<ImageResult> {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model,
        prompt,
        n: options?.numImages || 1,
        size: this.getOpenAISize(options?.width, options?.height)
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return {
      url: data.data[0]?.url,
      model
    };
  }

  private getOpenAISize(width?: number, height?: number): string {
    // DALL-E 3 supports: 1024x1024, 1792x1024, 1024x1792
    if (height && height > (width || 1024)) {
      return '1024x1792'; // Portrait
    } else if (width && width > (height || 1024)) {
      return '1792x1024'; // Landscape
    }
    return '1024x1024'; // Square
  }
}
