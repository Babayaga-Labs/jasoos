/**
 * UGC Engine - User Generated Content Story Generator
 *
 * Generates complete mystery stories from a text synopsis including:
 * - Story structure (plot, setting, solution)
 * - Characters (personalities, secrets, alibis)
 * - Plot points (evidence, clues, scoring)
 * - Images (scene and character portraits)
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AIConfig } from './config';
import { generateText } from './llm-client';
import { ImageClient } from './image-client';

// ============================================================================
// Types
// ============================================================================

export type GenerationStep =
  | 'story'
  | 'characters'
  | 'plot-points'
  | 'scene-image'
  | 'character-images';

export interface GenerationProgress {
  step: GenerationStep;
  message: string;
  progress: number; // 0-100
}

export interface StoryData {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedMinutes: number;
  setting: {
    location: string;
    timePeriod: string;
    atmosphere: string;
  };
  premise: string;
  actualEvents: string[];
  solution: {
    culprit: string;
    method: string;
    motive: string;
    explanation: string;
  };
  redHerrings: string[];
}

export interface CharacterData {
  id: string;
  name: string;
  role: string;
  age: number;
  isGuilty: boolean;
  personality: {
    traits: string[];
    speechStyle: string;
    quirks: string[];
  };
  appearance: {
    description: string;
    imagePrompt: string;
  };
  knowledge: {
    knowsAboutCrime: string;
    knowsAboutOthers: string[];
    alibi: string;
  };
  secrets: Array<{
    content: string;
    willingnessToReveal: 'low' | 'medium' | 'high' | 'never';
    revealCondition: string;
  }>;
  behaviorUnderPressure: {
    defensive: string;
    whenCaughtLying: string;
    whenAccused: string;
  };
  relationships: Record<string, string>;
}

export interface PlotPointData {
  id: string;
  category: 'motive' | 'alibi' | 'evidence' | 'relationship';
  description: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  points: number;
  revealedBy: string[];
  detectionHints: string[];
}

export interface PlotPointsData {
  plotPoints: PlotPointData[];
  minimumPointsToAccuse: number;
  perfectScoreThreshold: number;
}

export interface GenerationResult {
  storyId: string;
  story: StoryData;
  characters: CharacterData[];
  plotPoints: PlotPointsData;
}

// ============================================================================
// UGC Engine Class
// ============================================================================

export class UGCEngine {
  private config: AIConfig;
  private storiesDir: string;

  constructor(config: AIConfig, storiesDir?: string) {
    this.config = config;
    this.storiesDir = storiesDir || path.join(process.cwd(), 'stories');
  }

  /**
   * Generate a complete story from a synopsis with progress callbacks
   */
  async generateFromSynopsis(
    synopsis: string,
    onProgress: (progress: GenerationProgress) => void
  ): Promise<GenerationResult> {
    // Generate unique story ID
    const storyId = this.generateStoryId();
    const storyDir = this.createStoryDirectory(storyId);

    try {
      // Step 1: Generate story structure (20%)
      onProgress({ step: 'story', message: 'Crafting your mystery narrative...', progress: 0 });
      const story = await this.generateStory(synopsis, storyId);
      this.saveJSON(storyDir, 'story.json', story);
      onProgress({ step: 'story', message: 'Story structure created', progress: 20 });

      // Step 2: Generate characters (40%)
      onProgress({ step: 'characters', message: 'Creating suspects...', progress: 20 });
      const characters = await this.generateCharacters(synopsis, story);
      this.saveJSON(storyDir, 'characters.json', { characters });
      onProgress({ step: 'characters', message: 'Characters created', progress: 40 });

      // Step 3: Generate plot points (60%)
      onProgress({ step: 'plot-points', message: 'Placing evidence and clues...', progress: 40 });
      const plotPoints = await this.generatePlotPoints(story, characters);
      this.saveJSON(storyDir, 'plot-points.json', plotPoints);
      onProgress({ step: 'plot-points', message: 'Plot points created', progress: 60 });

      // Step 4: Generate scene image (80%)
      onProgress({ step: 'scene-image', message: 'Generating scene...', progress: 60 });
      try {
        await this.generateSceneImage(story, storyDir);
        onProgress({ step: 'scene-image', message: 'Scene image created', progress: 80 });
      } catch (imageError) {
        console.warn('Scene image generation failed, continuing without image:', imageError);
        onProgress({ step: 'scene-image', message: 'Scene image skipped (API unavailable)', progress: 80 });
      }

      // Step 5: Generate character portraits (100%)
      onProgress({ step: 'character-images', message: 'Creating character portraits...', progress: 80 });
      try {
        await this.generateCharacterImages(characters, storyDir);
        onProgress({ step: 'character-images', message: 'Character portraits created', progress: 100 });
      } catch (imageError) {
        console.warn('Character image generation failed, continuing without images:', imageError);
        onProgress({ step: 'character-images', message: 'Portraits skipped (API unavailable)', progress: 100 });
      }

      // Add to stories.config.json
      this.addToStoriesConfig(storyId, story.title);

      return { storyId, story, characters, plotPoints };

    } catch (error) {
      // Clean up on failure
      this.deleteStoryDirectory(storyId);
      throw error;
    }
  }

  /**
   * Generate a unique story ID
   */
  private generateStoryId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `ugc-${timestamp}-${random}`;
  }

  /**
   * Create the story directory structure
   */
  createStoryDirectory(storyId: string): string {
    const storyDir = path.join(this.storiesDir, storyId);
    const assetsDir = path.join(storyDir, 'assets', 'characters');
    fs.mkdirSync(assetsDir, { recursive: true });
    return storyDir;
  }

  /**
   * Delete a story directory (for cleanup on failure)
   */
  private deleteStoryDirectory(storyId: string): void {
    const storyDir = path.join(this.storiesDir, storyId);
    if (fs.existsSync(storyDir)) {
      fs.rmSync(storyDir, { recursive: true, force: true });
    }
  }

  /**
   * Save JSON data to a file
   */
  private saveJSON(storyDir: string, filename: string, data: unknown): void {
    fs.writeFileSync(
      path.join(storyDir, filename),
      JSON.stringify(data, null, 2)
    );
  }

  /**
   * Generate story structure from synopsis
   */
  async generateStory(synopsis: string, storyId: string): Promise<StoryData> {
    const prompt = `You are a mystery story writer. Based on the following synopsis, create a detailed story structure for a detective game.

SYNOPSIS:
${synopsis}

Generate a JSON object with this exact structure:
{
  "id": "${storyId}",
  "title": "Story Title",
  "difficulty": "easy" | "medium" | "hard",
  "estimatedMinutes": 20-40,
  "setting": {
    "location": "Where the story takes place",
    "timePeriod": "When (era/year)",
    "atmosphere": "Mood and tone"
  },
  "premise": "2-3 sentences shown to player at start, setting up the mystery",
  "actualEvents": [
    "Timeline of what actually happened, step by step",
    "Include times if relevant",
    "End with the crime being committed"
  ],
  "solution": {
    "culprit": "Name of the guilty character",
    "method": "How they committed the crime",
    "motive": "Why they did it",
    "explanation": "Full 3-4 sentence explanation for the player after they solve it"
  },
  "redHerrings": [
    "False leads to throw off the player",
    "Suspicious but innocent circumstances"
  ]
}

Respond with ONLY the JSON object, no other text.`;

    const { text } = await generateText({
      config: this.config.llm,
      prompt,
      maxTokens: 2000,
      temperature: 0.7,
    });

    return this.parseJSONResponse(text);
  }

  /**
   * Generate characters based on synopsis and story
   */
  async generateCharacters(synopsis: string, story: StoryData): Promise<CharacterData[]> {
    const prompt = `You are creating characters for a detective mystery game.

STORY CONTEXT:
Title: ${story.title}
Setting: ${story.setting.location}, ${story.setting.timePeriod}
Culprit: ${story.solution.culprit}
Motive: ${story.solution.motive}

SYNOPSIS:
${synopsis}

Create 4-5 suspects. One must be guilty (${story.solution.culprit}). Each character should have:
- Unique personality and speech patterns
- Clear alibi (false for the guilty one)
- Secrets they're hiding
- Knowledge about the crime and other characters
- Realistic behavior when pressured

Generate a JSON array of characters with this structure for EACH character:
[
  {
    "id": "snake_case_id",
    "name": "Full Name",
    "role": "Their role/occupation",
    "age": 30,
    "isGuilty": false,
    "personality": {
      "traits": ["trait1", "trait2", "trait3"],
      "speechStyle": "How they talk",
      "quirks": ["nervous habit", "verbal tic"]
    },
    "appearance": {
      "description": "Physical description",
      "imagePrompt": "Detailed prompt for AI image generation"
    },
    "knowledge": {
      "knowsAboutCrime": "What they witnessed or know",
      "knowsAboutOthers": ["Secret about character X", "Observation about Y"],
      "alibi": "Where they claim to have been"
    },
    "secrets": [
      {
        "content": "The secret they're hiding",
        "willingnessToReveal": "low" | "medium" | "high" | "never",
        "revealCondition": "What makes them reveal it"
      }
    ],
    "behaviorUnderPressure": {
      "defensive": "How they act when defensive",
      "whenCaughtLying": "How they react to being caught",
      "whenAccused": "How they respond to direct accusation"
    },
    "relationships": {
      "other_character_id": "Their relationship"
    }
  }
]

Respond with ONLY the JSON array, no other text.`;

    const { text } = await generateText({
      config: this.config.llm,
      prompt,
      maxTokens: 4000,
      temperature: 0.7,
    });

    return this.parseJSONResponse(text);
  }

  /**
   * Generate plot points based on story and characters
   */
  async generatePlotPoints(story: StoryData, characters: CharacterData[]): Promise<PlotPointsData> {
    const characterNames = characters.map(c => `${c.id} (${c.name})`).join(', ');

    const prompt = `You are creating plot points (clues/evidence) for a detective mystery game.

STORY:
Title: ${story.title}
Solution: ${story.solution.culprit} did it because ${story.solution.motive}

CHARACTERS: ${characterNames}

Create 8-12 plot points that the player can discover through interrogation. Include:
- Critical evidence pointing to the culprit
- Motive clues
- Alibi inconsistencies
- Red herrings
- Relationship revelations

Generate a JSON object:
{
  "plotPoints": [
    {
      "id": "pp_snake_case",
      "category": "motive" | "alibi" | "evidence" | "relationship",
      "description": "What the player learns",
      "importance": "low" | "medium" | "high" | "critical",
      "points": 10-30,
      "revealedBy": ["character_id1", "character_id2"],
      "detectionHints": ["keyword1", "keyword2", "phrase to detect"]
    }
  ],
  "minimumPointsToAccuse": 50,
  "perfectScoreThreshold": 100
}

Critical plot points should be worth more points.
Ensure total possible points is around 150-200.

Respond with ONLY the JSON object, no other text.`;

    const { text } = await generateText({
      config: this.config.llm,
      prompt,
      maxTokens: 3000,
      temperature: 0.7,
    });

    return this.parseJSONResponse(text);
  }

  /**
   * Generate scene image for the story
   */
  async generateSceneImage(story: StoryData, storyDir: string): Promise<void> {
    if (!this.config.image.apiKey) {
      throw new Error('IMAGE_API_KEY not configured');
    }

    const imageClient = new ImageClient(this.config.image);
    const scenePrompt = `${story.setting.location}, ${story.setting.timePeriod}, ${story.setting.atmosphere}, cinematic wide shot, dramatic lighting, detailed environment, atmospheric`;

    const result = await imageClient.generateScene(scenePrompt);
    const scenePath = path.join(storyDir, 'assets', 'scene.png');
    await this.downloadImage(result.url, scenePath);
  }

  /**
   * Generate character portrait images
   */
  async generateCharacterImages(characters: CharacterData[], storyDir: string): Promise<void> {
    if (!this.config.image.apiKey) {
      throw new Error('IMAGE_API_KEY not configured');
    }

    const imageClient = new ImageClient(this.config.image);
    const charactersDir = path.join(storyDir, 'assets', 'characters');

    for (const character of characters) {
      try {
        const result = await imageClient.generatePortrait(character.appearance.imagePrompt);
        const portraitPath = path.join(charactersDir, `${character.id}.png`);
        await this.downloadImage(result.url, portraitPath);
      } catch (error) {
        console.warn(`Failed to generate portrait for ${character.name}:`, error);
        // Continue with other characters
      }
    }
  }

  /**
   * Download an image from URL to local file
   */
  private async downloadImage(url: string, outputPath: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(buffer));
  }

  /**
   * Add the generated story to stories.config.json
   */
  addToStoriesConfig(storyId: string, title: string): void {
    const configPath = path.join(process.cwd(), 'stories.config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Check if story already exists
    const exists = config.stories.some((s: { id: string }) => s.id === storyId);
    if (exists) return;

    // Add new story entry
    config.stories.push({
      id: storyId,
      enabled: true,
      description: `${title} (User Generated)`,
      isUGC: true,
      createdAt: new Date().toISOString(),
    });

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  /**
   * Parse JSON from LLM response, handling common formatting issues
   */
  private parseJSONResponse(text: string): any {
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
}
