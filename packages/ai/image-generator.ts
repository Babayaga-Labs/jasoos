import { ImageClient } from './image-client';
import type { ImageConfig } from './config';

export class ImageGenerator {
  private client: ImageClient;
  private config: ImageConfig;

  constructor(imageConfig: ImageConfig) {
    this.client = new ImageClient(imageConfig);
    this.config = imageConfig;
  }

  /**
   * Generate a character portrait
   */
  async generatePortrait(prompt: string, characterId: string): Promise<string> {
    console.log(`[ImageGenerator] Generating portrait for ${characterId}`);
    console.log(`[ImageGenerator] Provider: ${this.config.provider}`);

    const result = await this.client.generatePortrait(prompt);
    return result.url;
  }

  /**
   * Generate a scene background
   */
  async generateScene(prompt: string, storyId: string): Promise<string> {
    console.log(`[ImageGenerator] Generating scene for ${storyId}`);
    console.log(`[ImageGenerator] Provider: ${this.config.provider}`);

    const result = await this.client.generateScene(prompt);
    return result.url;
  }

  /**
   * Batch generate all assets for a story
   */
  async generateStoryAssets(
    storyId: string,
    scenePrompt: string,
    characters: Array<{ id: string; imagePrompt: string }>
  ): Promise<{
    scene: string;
    portraits: Record<string, string>;
  }> {
    // Generate scene
    const scene = await this.generateScene(scenePrompt, storyId);

    // Generate all portraits
    const portraits: Record<string, string> = {};
    for (const char of characters) {
      portraits[char.id] = await this.generatePortrait(char.imagePrompt, char.id);
    }

    return { scene, portraits };
  }
}
