/**
 * UGC Engine - User Generated Content Story Generator
 *
 * Generates complete mystery stories from structured user input including:
 * - Story structure (plot, setting, solution)
 * - Characters (personalities, secrets, alibis)
 * - Plot points (evidence, clues, scoring)
 * - Images (scene and character portraits)
 *
 * Supports both:
 * - Legacy synopsis-based generation (generateFromSynopsis)
 * - New structured input generation (generateFromInput)
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AIConfig } from './config';
import { generateText } from './llm-client';
import { ImageClient } from './image-client';
import type {
  UGCFormInput,
  UGCGeneratedData,
  UGCGeneratedStory,
  UGCGeneratedCharacter,
  UGCGeneratedPlotPoint,
  UGCDraftState,
  EditableSection,
} from './types/ugc-types';

// ============================================================================
// Types (Legacy - kept for backwards compatibility)
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
  redHerrings?: string[]; // Made optional - no longer generated
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

// New structured result type
export interface StructuredGenerationResult {
  storyId: string;
  data: UGCGeneratedData;
  promptTraces: PromptTrace[];
}

// Prompt tracing for observability
export interface PromptTrace {
  timestamp: string;
  step: string;
  prompt: string;
}

// ============================================================================
// UGC Engine Class
// ============================================================================

export class UGCEngine {
  private config: AIConfig;
  private storiesDir: string;
  private promptTraces: PromptTrace[] = [];

  constructor(config: AIConfig, storiesDir?: string) {
    this.config = config;
    this.storiesDir = storiesDir || path.join(process.cwd(), 'stories');
  }

  /**
   * Reset prompt traces for a new generation
   */
  private resetPromptTraces(): void {
    this.promptTraces = [];
  }

  /**
   * Add a prompt trace entry
   */
  private tracePrompt(step: string, prompt: string): void {
    this.promptTraces.push({
      timestamp: new Date().toISOString(),
      step,
      prompt,
    });
  }

  /**
   * Get collected prompt traces
   */
  private getPromptTraces(): PromptTrace[] {
    return [...this.promptTraces];
  }

  /**
   * Save prompt traces to a file in the story directory
   */
  savePromptTraces(storyDir: string, traces: PromptTrace[]): void {
    const tracePath = path.join(storyDir, 'prompts-trace.txt');

    const content = traces.map(trace => {
      const separator = '='.repeat(80);
      return `${separator}
STEP: ${trace.step}
TIME: ${trace.timestamp}
${separator}

${trace.prompt}

`;
    }).join('\n');

    fs.writeFileSync(tracePath, content);
  }

  /**
   * Generate a story ID from the title (slugified)
   */
  private generateStoryIdFromTitle(title: string): string {
    // Slugify the title
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '-')         // Replace spaces with hyphens
      .replace(/-+/g, '-')          // Collapse multiple hyphens
      .substring(0, 40);            // Limit length

    // Add short random suffix for uniqueness
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${slug}-${suffix}`;
  }

  // ==========================================================================
  // New Structured Input Generation (Phase 2)
  // ==========================================================================

  /**
   * Generate a complete story from structured user input (new flow)
   * Does NOT save files - returns data for review phase
   */
  async generateFromInput(
    formInput: UGCFormInput,
    onProgress: (progress: GenerationProgress) => void
  ): Promise<StructuredGenerationResult> {
    // Reset traces for this generation
    this.resetPromptTraces();

    // Generate story ID from title (slugified)
    const storyId = this.generateStoryIdFromTitle(formInput.title);

    // Step 1: Generate story structure (20%)
    onProgress({ step: 'story', message: 'Crafting your mystery narrative...', progress: 0 });
    const story = await this.generateStoryFromInput(formInput, storyId);
    onProgress({ step: 'story', message: 'Story structure created', progress: 20 });

    // Step 2: Generate/enhance characters (40%)
    onProgress({ step: 'characters', message: 'Developing your characters...', progress: 20 });
    const characters = await this.generateCharactersFromInput(formInput, story);
    onProgress({ step: 'characters', message: 'Characters developed', progress: 40 });

    // Step 3: Generate plot points with interrogation constraints (60%)
    onProgress({ step: 'plot-points', message: 'Creating clues and evidence...', progress: 40 });
    const plotPoints = await this.generatePlotPointsFromInput(formInput, story, characters);
    onProgress({ step: 'plot-points', message: 'Clues created', progress: 60 });

    // Note: Images are generated in Phase 4 (save) after user review
    onProgress({ step: 'scene-image', message: 'Ready for review', progress: 80 });
    onProgress({ step: 'character-images', message: 'Generation complete', progress: 100 });

    return {
      storyId,
      data: {
        story,
        characters,
        plotPoints,
      },
      promptTraces: this.getPromptTraces(),
    };
  }

  /**
   * Generate story structure from structured input
   */
  private async generateStoryFromInput(
    formInput: UGCFormInput,
    storyId: string
  ): Promise<UGCGeneratedStory> {
    const culpritChar = formInput.characters.find(c => c.tempId === formInput.crime.culpritId);
    const victimChar = formInput.characters.find(c => c.isVictim);
    const timePeriod = formInput.timePeriod === 'other'
      ? formInput.customTimePeriod || 'Present day'
      : formInput.timePeriod;

    const prompt = `You are a mystery story writer. Create the story structure for a detective game based on the following user-provided details.

USER'S STORY DETAILS:
- Title: ${formInput.title}
- Setting: ${formInput.settingLocation}
- Time Period: ${timePeriod}
- Premise: ${formInput.premise}
- Crime Type: ${formInput.crime.crimeType}
- Culprit: ${culpritChar?.name || 'Unknown'} (${culpritChar?.role || 'Unknown'})
- Motive: ${formInput.crime.motive}
- Method: ${formInput.crime.method}
${victimChar ? `- Victim: ${victimChar.name} (${victimChar.role})` : ''}

CHARACTERS:
${formInput.characters.map(c => `- ${c.name}: ${c.role} - ${c.description}`).join('\n')}

Generate a JSON object with this structure:
{
  "id": "${storyId}",
  "title": "${formInput.title}",
  "difficulty": "easy" | "medium" | "hard",
  "estimatedMinutes": 20-40,
  "setting": {
    "location": "${formInput.settingLocation}",
    "timePeriod": "${timePeriod}",
    "atmosphere": "Describe the mood and tone fitting the setting"
  },
  "premise": "Polish the user's premise into 2-3 compelling sentences shown to the player at the start",
  "actualEvents": [
    "Timeline of what actually happened, step by step",
    "Include times if relevant (e.g., '7:00 PM - Event happens')",
    "Show what each character was doing",
    "End with the crime being committed and discovered"
  ],
  "solution": {
    "culprit": "${culpritChar?.name || 'Unknown'}",
    "method": "Expand on: ${formInput.crime.method}",
    "motive": "Expand on: ${formInput.crime.motive}",
    "explanation": "Full 3-4 sentence explanation for the player after they solve it, connecting all the pieces"
  }
}

IMPORTANT:
- The actualEvents timeline should be detailed (6-10 events minimum)
- Make the atmosphere fitting for the crime type and setting
- The explanation should feel satisfying and tie everything together

Respond with ONLY the JSON object, no other text.`;

    // Trace the prompt before LLM call
    this.tracePrompt('story-generation', prompt);

    const { text } = await generateText({
      config: this.config.llm,
      prompt,
      maxTokens: 2000,
      temperature: 0.7,
    });

    return this.parseJSONResponse(text);
  }

  /**
   * Generate/enhance characters from structured input
   */
  private async generateCharactersFromInput(
    formInput: UGCFormInput,
    story: UGCGeneratedStory
  ): Promise<UGCGeneratedCharacter[]> {
    const charactersJson = formInput.characters.map(c => ({
      tempId: c.tempId,
      name: c.name,
      role: c.role,
      description: c.description,
      isVictim: c.isVictim || false,
      isGuilty: c.tempId === formInput.crime.culpritId,
      personalityTraits: c.personalityTraits || [],
      secret: c.secret || null,
    }));

    const prompt = `You are developing characters for a detective mystery game. The user has provided basic character info. Your job is to ENHANCE these characters with gameplay-relevant details.

STORY CONTEXT:
- Title: ${story.title}
- Setting: ${story.setting.location}, ${story.setting.timePeriod}
- Atmosphere: ${story.setting.atmosphere}
- Crime: ${story.solution.culprit} committed the crime because ${story.solution.motive}
- Method: ${story.solution.method}

TIMELINE OF EVENTS:
${story.actualEvents.join('\n')}

USER'S CHARACTERS:
${JSON.stringify(charactersJson, null, 2)}

For EACH character, generate enhanced details. The output must be a JSON array with this structure for each character:
[
  {
    "id": "snake_case_id_from_name",
    "tempId": "original tempId from input",
    "name": "Character name",
    "role": "Their role",
    "age": appropriate_age_number,
    "isGuilty": true/false,
    "isVictim": true/false,
    "personality": {
      "traits": ["use user's traits if provided, or generate 3 appropriate ones"],
      "speechStyle": "How they talk - formal, casual, nervous, etc.",
      "quirks": ["2 behavioral quirks or mannerisms"]
    },
    "appearance": {
      "description": "User's description",
      "imagePrompt": "Detailed prompt for AI portrait generation based on description"
    },
    "knowledge": {
      "knowsAboutCrime": "What this character witnessed, heard, or knows about the crime based on the timeline",
      "knowsAboutOthers": ["What they know about other characters that could be revealed in interrogation"],
      "alibi": "INTERNAL: Where they claim to have been (can include notes like 'false' for guilty character)"
    },
    "statement": "Third-person case summary shown to player. 1-2 sentences describing their claimed whereabouts and connection to the incident. Like detective notes.",
    "secrets": [
      {
        "content": "Use user's secret if provided, or generate one",
        "willingnessToReveal": "low" | "medium" | "high" | "never",
        "revealCondition": "What makes them reveal this secret"
      }
    ],
    "behaviorUnderPressure": {
      "defensive": "How they act when feeling defensive",
      "whenCaughtLying": "How they react when caught in a lie",
      "whenAccused": "How they respond to direct accusation"
    },
    "relationships": {
      "other_character_id": "Their relationship description"
    }
  }
]

CRITICAL RULES:
1. The guilty character's alibi must be FALSE or have holes
2. Innocent characters should have TRUE alibis that can be verified
3. Each character should KNOW something useful that can be revealed through interrogation
4. The "knowsAboutOthers" should include actionable information about other suspects
5. Relationships should create a web of connections between characters

STATEMENT FIELD GUIDELINES (CRITICAL - this is shown to players!):
- Written in THIRD PERSON, like detective case notes or a police report summary
- 1-2 sentences describing: their claimed whereabouts + their connection to the incident
- This gives players a starting point for interrogation without revealing the mystery

WHAT TO INCLUDE:
- Where they claim to be during the incident
- How they relate to the crime (found body, was nearby, arrived late, etc.)
- Neutral factual tone

WHAT TO NEVER INCLUDE:
- "(false)" or "(true)" annotations - those are internal only
- What they know about OTHER characters - player discovers through interrogation
- Evidence or clues - player must uncover these
- Whether their alibi is actually true or not

EXAMPLES:
- GOOD: "Claims he was practicing basic spells near the paddock. Was present when the incident was discovered."
- GOOD: "Was inside the hut preparing tea. Found the horse dead the following morning."
- GOOD: "Says she was examining plants in the garden. Did not directly witness the incident."
- BAD: "Claims he was far from the horse (false)" - reveals the lie!
- BAD: "Noticed Ron's broken wand during tea" - reveals evidence!
- BAD: "Is hiding that she saw everything" - reveals secret!

Respond with ONLY the JSON array, no other text.`;

    // Trace the prompt before LLM call
    this.tracePrompt('character-generation', prompt);

    const { text } = await generateText({
      config: this.config.llm,
      prompt,
      maxTokens: 4000,
      temperature: 0.7,
    });

    const characters: UGCGeneratedCharacter[] = this.parseJSONResponse(text);

    // Preserve uploaded image URLs
    return characters.map(char => {
      const inputChar = formInput.characters.find(c => c.tempId === char.tempId);
      return {
        ...char,
        imageUrl: inputChar?.uploadedImageUrl || undefined,
      };
    });
  }

  /**
   * Generate plot points with interrogation-based clue constraints
   */
  private async generatePlotPointsFromInput(
    formInput: UGCFormInput,
    story: UGCGeneratedStory,
    characters: UGCGeneratedCharacter[]
  ): Promise<{
    plotPoints: UGCGeneratedPlotPoint[];
    minimumPointsToAccuse: number;
    perfectScoreThreshold: number;
  }> {
    // Filter out victims - they can't reveal clues (they're dead/missing)
    const interactableCharacters = characters.filter(c => !c.isVictim);
    const victimCharacters = characters.filter(c => c.isVictim);

    const characterInfo = interactableCharacters.map(c => ({
      id: c.id,
      name: c.name,
      role: c.role,
      isGuilty: c.isGuilty,
      knowsAboutCrime: c.knowledge.knowsAboutCrime,
      knowsAboutOthers: c.knowledge.knowsAboutOthers,
    }));

    const victimInfo = victimCharacters.length > 0
      ? `\nVICTIM(S) - Cannot be interrogated:\n${victimCharacters.map(v => `- ${v.name} (${v.role})`).join('\n')}`
      : '';

    const prompt = `You are creating clues and evidence for a detective mystery game where the ONLY way to discover information is through CHARACTER INTERROGATION.
${victimInfo}

STORY:
- Title: ${story.title}
- Solution: ${story.solution.culprit} did it because ${story.solution.motive}
- Method: ${story.solution.method}

TIMELINE:
${story.actualEvents.join('\n')}

CHARACTERS AND THEIR KNOWLEDGE:
${JSON.stringify(characterInfo, null, 2)}

Create 8-12 plot points (clues) that form a solvable mystery. Generate a JSON object:

{
  "plotPoints": [
    {
      "id": "pp_snake_case_id",
      "category": "motive" | "alibi" | "evidence" | "relationship",
      "description": "What the player learns when this clue is revealed",
      "importance": "low" | "medium" | "high" | "critical",
      "points": 10-30,
      "revealedBy": ["character_id_who_can_reveal_this"],
      "detectionHints": ["keywords", "phrases", "topics that trigger this clue"]
    }
  ],
  "minimumPointsToAccuse": 50,
  "perfectScoreThreshold": calculated_total_of_all_points
}

CRITICAL RULES FOR CLUE GENERATION:
1. EVERY clue MUST be assigned to at least one LIVING character who can reveal it
2. NEVER include victims in revealedBy - they are dead/missing and cannot be interrogated!
3. Characters can only reveal clues they would realistically know:
   - They witnessed the event directly
   - They overheard a conversation
   - They have expertise to notice something (doctor spots poison, accountant notices fraud)
   - They know the culprit/victim personally
   - Another character told them
4. The player solves this ONLY through interrogation - NO physical evidence found randomly
5. Critical clues pointing to the culprit must be discoverable through conversation
6. Include clues that:
   - Point to the culprit's motive (at least 2)
   - Expose the culprit's false alibi (at least 1-2)
   - Show the culprit's opportunity (at least 1)
   - Provide corroborating evidence (at least 2)

DETECTION HINTS should include:
- Direct question keywords ("where were you", "what did you see")
- Topic triggers ("alibi", "that night", "relationship")
- Character name mentions that might reveal info about them

Respond with ONLY the JSON object, no other text.`;

    // Trace the prompt before LLM call
    this.tracePrompt('plot-points-generation', prompt);

    const { text } = await generateText({
      config: this.config.llm,
      prompt,
      maxTokens: 3000,
      temperature: 0.7,
    });

    return this.parseJSONResponse(text);
  }

  // ==========================================================================
  // Section Regeneration (for Phase 3 Review)
  // ==========================================================================

  /**
   * Regenerate a specific section during the review phase
   */
  async regenerateSection(
    section: EditableSection,
    formInput: UGCFormInput,
    currentDraft: UGCDraftState
  ): Promise<Partial<UGCGeneratedData>> {
    switch (section) {
      case 'timeline':
        return this.regenerateTimeline(formInput, currentDraft);
      case 'characterKnowledge':
      case 'characterAlibis':
        return this.regenerateCharacterDetails(section, formInput, currentDraft);
      case 'relationships':
        return this.regenerateRelationships(formInput, currentDraft);
      case 'clues':
        return this.regenerateClues(formInput, currentDraft);
      case 'solution':
        return this.regenerateSolution(formInput, currentDraft);
      default:
        throw new Error(`Unknown section: ${section}`);
    }
  }

  private async regenerateTimeline(
    formInput: UGCFormInput,
    currentDraft: UGCDraftState
  ): Promise<Partial<UGCGeneratedData>> {
    const prompt = `Regenerate the timeline of events for this mystery story.

STORY CONTEXT:
- Title: ${currentDraft.story.title}
- Setting: ${currentDraft.story.setting.location}, ${currentDraft.story.setting.timePeriod}
- Culprit: ${currentDraft.story.solution.culprit}
- Method: ${currentDraft.story.solution.method}
- Motive: ${currentDraft.story.solution.motive}

CHARACTERS:
${currentDraft.characters.map(c => `- ${c.name} (${c.role})`).join('\n')}

Generate a NEW timeline with 6-10 events. Each event should include a time and what happened.
Format: JSON array of strings, e.g., ["7:00 PM - Event 1", "7:30 PM - Event 2", ...]

The timeline should show what each character was doing leading up to and during the crime.

Respond with ONLY the JSON array.`;

    const { text } = await generateText({
      config: this.config.llm,
      prompt,
      maxTokens: 1000,
      temperature: 0.8,
    });

    const actualEvents = this.parseJSONResponse(text);
    return {
      story: {
        ...currentDraft.story,
        actualEvents,
      },
    };
  }

  private async regenerateCharacterDetails(
    section: 'characterKnowledge' | 'characterAlibis',
    formInput: UGCFormInput,
    currentDraft: UGCDraftState
  ): Promise<Partial<UGCGeneratedData>> {
    const field = section === 'characterKnowledge' ? 'knowsAboutCrime and knowsAboutOthers' : 'alibi';

    const prompt = `Regenerate the ${field} for all characters in this mystery.

STORY CONTEXT:
- Timeline: ${currentDraft.story.actualEvents.join(' | ')}
- Culprit: ${currentDraft.story.solution.culprit}
- Method: ${currentDraft.story.solution.method}

CHARACTERS:
${currentDraft.characters.map(c => `- ${c.id}: ${c.name} (${c.role}) - Guilty: ${c.isGuilty}`).join('\n')}

Generate a JSON object mapping character IDs to their new ${field}:
${section === 'characterKnowledge' ? `{
  "character_id": {
    "knowsAboutCrime": "What they witnessed or know",
    "knowsAboutOthers": ["Info about other characters"]
  }
}` : `{
  "character_id": "Their alibi claim"
}`}

RULES:
- Guilty character's alibi should have holes or be false
- Innocent characters should have verifiable alibis
- Knowledge should be based on what they could realistically know from the timeline

Respond with ONLY the JSON object.`;

    const { text } = await generateText({
      config: this.config.llm,
      prompt,
      maxTokens: 2000,
      temperature: 0.8,
    });

    const updates = this.parseJSONResponse(text);
    const updatedCharacters = currentDraft.characters.map(char => {
      const update = updates[char.id];
      if (!update) return char;

      if (section === 'characterKnowledge') {
        return {
          ...char,
          knowledge: {
            ...char.knowledge,
            knowsAboutCrime: update.knowsAboutCrime,
            knowsAboutOthers: update.knowsAboutOthers,
          },
        };
      } else {
        return {
          ...char,
          knowledge: {
            ...char.knowledge,
            alibi: update,
          },
        };
      }
    });

    return { characters: updatedCharacters };
  }

  private async regenerateRelationships(
    formInput: UGCFormInput,
    currentDraft: UGCDraftState
  ): Promise<Partial<UGCGeneratedData>> {
    const prompt = `Regenerate the relationships between all characters in this mystery.

CHARACTERS:
${currentDraft.characters.map(c => `- ${c.id}: ${c.name} (${c.role})`).join('\n')}

STORY CONTEXT:
- Culprit: ${currentDraft.story.solution.culprit}
- Motive: ${currentDraft.story.solution.motive}

Generate a JSON object mapping each character ID to their relationships:
{
  "character_id": {
    "other_character_id": "Description of their relationship"
  }
}

Create interesting relationships that add depth to the mystery. Include:
- Professional relationships
- Personal connections (family, romantic, friendships)
- Conflicts or tensions
- Secret connections

Respond with ONLY the JSON object.`;

    const { text } = await generateText({
      config: this.config.llm,
      prompt,
      maxTokens: 2000,
      temperature: 0.8,
    });

    const relationships = this.parseJSONResponse(text);
    const updatedCharacters = currentDraft.characters.map(char => ({
      ...char,
      relationships: relationships[char.id] || char.relationships,
    }));

    return { characters: updatedCharacters };
  }

  private async regenerateClues(
    formInput: UGCFormInput,
    currentDraft: UGCDraftState
  ): Promise<Partial<UGCGeneratedData>> {
    // Use the main plot points generation with current draft context
    const plotPoints = await this.generatePlotPointsFromInput(
      formInput,
      currentDraft.story,
      currentDraft.characters
    );
    return { plotPoints };
  }

  private async regenerateSolution(
    formInput: UGCFormInput,
    currentDraft: UGCDraftState
  ): Promise<Partial<UGCGeneratedData>> {
    const prompt = `Regenerate the solution explanation for this mystery.

STORY:
- Culprit: ${currentDraft.story.solution.culprit}
- Method: ${currentDraft.story.solution.method}
- Motive: ${currentDraft.story.solution.motive}

TIMELINE:
${currentDraft.story.actualEvents.join('\n')}

Write a new 3-4 sentence explanation that will be shown to the player after they solve the mystery.
It should:
- Clearly explain why the culprit did it
- Describe how they committed the crime
- Connect the key pieces of evidence
- Feel satisfying and conclusive

Respond with ONLY the explanation text (no JSON, just the explanation string).`;

    const { text } = await generateText({
      config: this.config.llm,
      prompt,
      maxTokens: 500,
      temperature: 0.8,
    });

    return {
      story: {
        ...currentDraft.story,
        solution: {
          ...currentDraft.story.solution,
          explanation: text.trim().replace(/^["']|["']$/g, ''),
        },
      },
    };
  }

  // ==========================================================================
  // Save Final Story (Phase 4)
  // ==========================================================================

  /**
   * Save the final story after user review
   */
  async saveFinalStory(
    storyId: string,
    draft: UGCDraftState,
    formInput: UGCFormInput,
    onProgress: (progress: GenerationProgress) => void,
    promptTraces?: PromptTrace[]
  ): Promise<string> {
    const storyDir = this.createStoryDirectory(storyId);

    try {
      // Save story.json
      this.saveJSON(storyDir, 'story.json', draft.story);

      // Save prompt traces if provided (for observability)
      if (promptTraces && promptTraces.length > 0) {
        this.savePromptTraces(storyDir, promptTraces);
      }

      // Save characters.json (remove tempId and imageUrl, keep isVictim for filtering)
      const finalCharacters = draft.characters.map(({ tempId, imageUrl, ...char }) => char);
      this.saveJSON(storyDir, 'characters.json', { characters: finalCharacters });

      // Save plot-points.json
      this.saveJSON(storyDir, 'plot-points.json', draft.plotPoints);

      // Generate images for characters that don't have uploaded images
      onProgress({ step: 'scene-image', message: 'Generating scene...', progress: 60 });
      try {
        await this.generateSceneImage(draft.story as StoryData, storyDir);
      } catch (err) {
        console.warn('Scene image generation failed:', err);
      }

      onProgress({ step: 'character-images', message: 'Generating portraits...', progress: 80 });
      try {
        await this.generateCharacterImagesFromDraft(draft.characters, formInput, storyDir);
      } catch (err) {
        console.warn('Character image generation failed:', err);
      }

      onProgress({ step: 'character-images', message: 'Finalizing...', progress: 100 });

      // Generate roleplay prompts for each character
      this.generateRoleplayPrompts(draft.characters, storyDir);

      // Add to stories.config.json
      this.addToStoriesConfig(storyId, draft.story.title);

      return storyId;
    } catch (error) {
      this.deleteStoryDirectory(storyId);
      throw error;
    }
  }

  /**
   * Generate character images, skipping those with uploaded images
   */
  private async generateCharacterImagesFromDraft(
    characters: UGCGeneratedCharacter[],
    formInput: UGCFormInput,
    storyDir: string
  ): Promise<void> {
    if (!this.config.image.apiKey) {
      console.warn('IMAGE_API_KEY not configured, skipping character images');
      return;
    }

    const imageClient = new ImageClient(this.config.image);
    const charactersDir = path.join(storyDir, 'assets', 'characters');

    for (const character of characters) {
      // Check if user uploaded an image for this character
      const inputChar = formInput.characters.find(c => c.tempId === character.tempId);
      if (inputChar?.uploadedImageUrl) {
        // Copy/download uploaded image
        await this.downloadImage(inputChar.uploadedImageUrl, path.join(charactersDir, `${character.id}.png`));
        continue;
      }

      // Generate image
      try {
        const result = await imageClient.generatePortrait(character.appearance.imagePrompt);
        await this.downloadImage(result.url, path.join(charactersDir, `${character.id}.png`));
      } catch (error) {
        console.warn(`Failed to generate portrait for ${character.name}:`, error);
      }
    }
  }

  // ==========================================================================
  // Roleplay Prompt Generation
  // ==========================================================================

  /**
   * Generate roleplay prompt files for each character
   */
  private generateRoleplayPrompts(
    characters: UGCGeneratedCharacter[],
    storyDir: string
  ): void {
    const promptsDir = path.join(storyDir, 'roleplay_prompts');
    fs.mkdirSync(promptsDir, { recursive: true });

    for (const character of characters) {
      // Skip victims - they can't be interrogated
      if (character.isVictim) continue;

      const promptContent = this.buildCharacterPrompt(character);
      const promptPath = path.join(promptsDir, `${character.id}.txt`);
      fs.writeFileSync(promptPath, promptContent);
    }
  }

  /**
   * Build the roleplay prompt for a character
   */
  private buildCharacterPrompt(character: UGCGeneratedCharacter): string {
    const { personality, knowledge, secrets, behaviorUnderPressure, relationships } = character;

    const quirksStr = personality.quirks?.join('; ') || 'None';
    const knowsAboutOthersStr = knowledge.knowsAboutOthers?.map((k: string) => `  - ${k}`).join('\n') || '  - Nothing specific';
    const secretsStr = secrets?.map((s: { content: string; willingnessToReveal: string; revealCondition: string }) =>
      `- ${s.content} [Will reveal: ${s.willingnessToReveal}] [Condition: ${s.revealCondition}]`
    ).join('\n') || '- None';
    const relationshipsStr = Object.entries(relationships || {}).map(([id, rel]) => `- ${id}: ${rel}`).join('\n') || '- No specific relationships defined';

    const guiltyInstructions = character.isGuilty
      ? 'You ARE guilty. Be subtle in your deception. Deflect, redirect, but never outright confess unless given absolutely undeniable proof.'
      : 'You are innocent. Cooperate with the investigation while protecting your minor secrets.';

    return `You are ${character.name}, ${character.role}. You are being interrogated by a detective investigating a crime.

## YOUR IDENTITY
- Name: ${character.name}
- Role: ${character.role}
- Age: ${character.age}
- Personality: ${personality.traits.join(', ')}
- Speech style: ${personality.speechStyle}
- Quirks: ${quirksStr}

## WHAT YOU KNOW
- About the crime: ${knowledge.knowsAboutCrime}
- Your alibi: ${knowledge.alibi}
- About others:
${knowsAboutOthersStr}

## YOUR SECRETS (Never reveal these directly, only if truly cornered)
${secretsStr}

## HOW YOU BEHAVE
- When defensive: ${behaviorUnderPressure?.defensive || 'Get evasive'}
- When caught in a lie: ${behaviorUnderPressure?.whenCaughtLying || 'Deflect'}
- When directly accused: ${behaviorUnderPressure?.whenAccused || 'Deny firmly'}

## YOUR RELATIONSHIPS
${relationshipsStr}

## ROLEPLAY RULES
1. Stay in character at ALL times. Never break character or acknowledge you're an AI.
2. Speak naturally in first person as ${character.name}.
3. Be cooperative but protective of your secrets.
4. If asked something you don't know, say you don't know - don't make things up.
5. Show appropriate emotions - nervousness when pressed on lies, indignation when falsely accused.
6. Keep responses concise (2-4 sentences typically).
7. ${guiltyInstructions}

Respond only as ${character.name}. Begin.
`;
  }

  // ==========================================================================
  // Legacy Synopsis-Based Generation (Backwards Compatibility)
  // ==========================================================================

  /**
   * Generate a complete story from a synopsis with progress callbacks
   * @deprecated Use generateFromInput for the new structured flow
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
  saveJSON(storyDir: string, filename: string, data: unknown): void {
    fs.writeFileSync(
      path.join(storyDir, filename),
      JSON.stringify(data, null, 2)
    );
  }

  /**
   * Generate story structure from synopsis (legacy)
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
  }
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
   * Generate characters based on synopsis and story (legacy)
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
   * Generate plot points based on story and characters (legacy)
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
- Relationship revelations

IMPORTANT: Every clue must be tied to a character who can reveal it through interrogation.

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
   * Generate character portrait images (legacy)
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
