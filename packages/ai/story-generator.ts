import Anthropic from '@anthropic-ai/sdk';
import type { Story, Character, PlotPoint } from '../types';

export class StoryGenerator {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic();
  }

  /**
   * Generate a complete story from a premise
   * Can be used for fully automated story creation
   */
  async generateStory(premise: string): Promise<{
    story: Story;
    characters: Character[];
    plotPoints: PlotPoint[];
  }> {
    // TODO: Implement full story generation
    // 1. Generate story outline (setting, events, solution)
    // 2. Generate characters based on story needs
    // 3. Generate plot points from story
    throw new Error('Not implemented - use manual story creation for now');
  }

  /**
   * Generate character system prompts from character definitions
   * Useful for refining manually created characters
   */
  async refineCharacter(character: Partial<Character>): Promise<Character> {
    const prompt = `Given this character sketch, expand it into a full character definition for a detective mystery game:

${JSON.stringify(character, null, 2)}

Expand the personality, add behavioral details, and ensure the character has depth for interrogation gameplay. Return as JSON matching the Character type.`;

    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse character JSON');

    return JSON.parse(jsonMatch[0]) as Character;
  }

  /**
   * Generate image prompts optimized for character portraits
   */
  generateImagePrompt(character: Character): string {
    const { appearance, personality, role, age } = character;

    // Construct a detailed prompt for consistent portrait generation
    return `Portrait of ${role}, ${age} years old. ${appearance.description}. ` +
      `Expression suggests ${personality.traits[0]} personality. ` +
      `Victorian era style, painterly, dramatic lighting, detailed face, ` +
      `professional portrait composition, muted colors, atmospheric.`;
  }
}
