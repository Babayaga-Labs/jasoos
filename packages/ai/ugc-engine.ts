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
import { generateText, LLMClient } from './llm-client';
import { ImageClient } from './image-client';
import { CharacterKnowledgeSchema, type CharacterKnowledgeResponse } from './schemas/character-knowledge';
import type {
  UGCFormInput,
  UGCGeneratedData,
  UGCGeneratedStory,
  UGCGeneratedCharacter,
  UGCGeneratedPlotPoint,
  UGCDraftState,
  EditableSection,
  // Scaffold-based types
  UGCStoryScaffold,
  UGCCharacterSuggestion,
  UGCCharacterFromScaffold,
  UGCScaffoldFormInput,
  UGCGeneratedTimeline,
  UGCGeneratedCharacterKnowledge,
  // New foundation-based types (UGC Pipeline Redesign v2)
  UGCFoundationCharacter,
  UGCFoundation,
  CulpritInfo,
  FleshOutRequest,
  FleshOutResponse,
  UGCGeneratedClue,
  UGCSolution,
  FleshOutProgressEvent,
  RegenerateTimelineRequest,
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
// Statement Derivation Helper
// ============================================================================

/**
 * Derive a third-person statement from a character's alibi
 * Used instead of LLM generation since statement is just a reformatted alibi
 */
export function deriveStatementFromAlibi(name: string, alibi: string): string {
  if (!alibi || alibi.length < 5) {
    return `${name} was present during the incident. No detailed statement provided.`;
  }

  // Clean up internal annotations
  let cleanAlibi = alibi
    .replace(/\s*\(false\)\s*/gi, '')
    .replace(/\s*\(true\)\s*/gi, '')
    .trim();

  // If already third-person style
  if (/^claims?\s/i.test(cleanAlibi)) {
    return cleanAlibi.charAt(0).toUpperCase() + cleanAlibi.slice(1);
  }

  // Convert first-person to third-person
  if (/^i (was|am|have|had|went|saw|heard)/i.test(cleanAlibi)) {
    return cleanAlibi
      .replace(/^i was/i, `Claims to have been`)
      .replace(/^i am/i, `Says they are`)
      .replace(/^i have/i, `Says they have`)
      .replace(/^i had/i, `Claims they had`)
      .replace(/^i went/i, `Says they went`)
      .replace(/^i saw/i, `Claims to have seen`)
      .replace(/^i heard/i, `Claims to have heard`);
  }

  // Wrap as a claim
  return `"${cleanAlibi}"`;
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
      "traits": "COPY the user's personalityTraits array exactly as provided",
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

    // Preserve uploaded image URLs and derive statement from alibi
    return characters.map(char => {
      const inputChar = formInput.characters.find(c => c.tempId === char.tempId);
      return {
        ...char,
        // Derive statement from alibi instead of LLM generation
        statement: deriveStatementFromAlibi(char.name, char.knowledge?.alibi || ''),
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
  // NEW SCAFFOLD-BASED GENERATION (Character-Driven Flow)
  // ==========================================================================

  /**
   * Generate story scaffold from a basic premise (LLM Call 1)
   * Returns title, synopsis, crime type, victim paragraph, and character suggestions
   */
  async generateStoryScaffold(premise: string): Promise<UGCStoryScaffold> {
    const prompt = `You are a mystery story architect. Given a basic premise, generate a story scaffold that provides structure while leaving room for user customization.

USER'S PREMISE:
${premise}

Generate a JSON object with this structure:
{
  "title": "Compelling 3-6 word title for the mystery",
  "synopsis": "2-3 sentence polished premise that draws players in. This will be shown at the start of the game.",
  "crimeType": "murder" | "theft" | "kidnapping" | "fraud" | "sabotage",
  "setting": {
    "location": "Specific location inferred from premise (e.g., 'Westbrook Manor', 'The Silver Moon Casino')",
    "timePeriod": "Time period inferred from premise, or 'modern' if unclear",
    "atmosphere": "Mood and tone fitting the crime type (e.g., 'tense and claustrophobic', 'glamorous yet dangerous')"
  },
  "suggestedCharacters": [
    {
      "suggestionId": "char_1",
      "suggestedName": "Appropriate name for the setting/era",
      "role": "Their role/occupation (e.g., 'The Business Partner', 'The Butler', 'The Ex-Spouse')",
      "connectionToCrime": "Why they might be involved or suspected",
      "potentialMotive": "Vague hint at what could drive them to crime (user will elaborate)"
    }
  ],
  "victimParagraph": "A compelling 2-3 sentence paragraph about the victim. Who were they? What was their role/status? Why might someone want them gone? This sets the emotional stakes."
}

RULES:
1. Suggest 4-5 character ARCHETYPES - these are starting points, not fully formed characters
2. DO NOT decide who the culprit is - that's the user's choice
3. Character names should fit the setting and time period
4. Each character should have a DISTINCT connection to the crime (not just "was there")
5. Include variety: someone with clear motive, someone with access, a red herring, an insider
6. potentialMotive should be VAGUE - just a hint (e.g., "financial troubles", "old grudge") not a full backstory
7. If the crime type isn't clear from the premise, infer the most fitting one
8. The victimParagraph should be evocative and make the player care about solving the mystery

Respond with ONLY the JSON object, no other text.`;

    this.tracePrompt('scaffold-generation', prompt);

    const { text } = await generateText({
      config: this.config.llm,
      prompt,
      maxTokens: 2000,
      temperature: 0.7,
    });

    // Parse response and ensure backward compatibility
    const scaffold = this.parseJSONResponse(text);

    // Handle backward compatibility: if response has old field names, map them
    if (scaffold.hook && !scaffold.synopsis) {
      scaffold.synopsis = scaffold.hook;
    }
    if (scaffold.victimContext && !scaffold.victimParagraph) {
      scaffold.victimParagraph = scaffold.victimContext;
    }

    return scaffold;
  }

  /**
   * Generate complete story from scaffold-based input (new flow)
   * This is the main entry point for the character-driven generation
   */
  async generateFromScaffold(
    formInput: UGCScaffoldFormInput,
    onProgress: (progress: GenerationProgress) => void
  ): Promise<StructuredGenerationResult> {
    this.resetPromptTraces();

    // Generate story ID from title
    const storyId = this.generateStoryIdFromTitle(formInput.scaffold.title);

    // Find the culprit character
    const culprit = formInput.characters.find(c => c.isCulprit);
    if (!culprit) {
      throw new Error('No culprit selected');
    }

    // Step 1: Generate timeline from character secrets (LLM Call 2)
    onProgress({ step: 'story', message: 'Building timeline from character secrets...', progress: 0 });
    const timeline = await this.generateTimelineFromCharacters(formInput, culprit);
    onProgress({ step: 'story', message: 'Timeline created', progress: 25 });

    // Build the story object
    const story: UGCGeneratedStory = {
      id: storyId,
      title: formInput.scaffold.title,
      difficulty: this.calculateDifficulty(formInput.characters.length),
      estimatedMinutes: 25 + (formInput.characters.length * 5),
      setting: formInput.scaffold.setting,
      premise: formInput.scaffold.synopsis || formInput.scaffold.hook || '', // Support both new and old field names
      actualEvents: timeline.actualEvents,
      solution: timeline.solution,
    };

    // Step 2: Generate character knowledge from timeline (LLM Call 4)
    onProgress({ step: 'characters', message: 'Deriving character knowledge from timeline...', progress: 25 });
    const characterKnowledge = await this.generateCharacterKnowledgeFromTimeline(
      formInput,
      story,
      culprit
    );
    onProgress({ step: 'characters', message: 'Character details generated', progress: 50 });

    // Build full character objects
    const characters = this.buildCharactersFromScaffold(formInput, characterKnowledge, culprit);

    // Step 3: Generate plot points (LLM Call 3)
    onProgress({ step: 'plot-points', message: 'Creating discoverable clues...', progress: 50 });
    const plotPoints = await this.generatePlotPointsFromScaffold(story, characters);
    onProgress({ step: 'plot-points', message: 'Clues created', progress: 75 });

    onProgress({ step: 'scene-image', message: 'Ready for review', progress: 90 });
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
   * Generate timeline based on character secrets (LLM Call 2)
   * This is the key change - timeline emerges FROM character details
   */
  private async generateTimelineFromCharacters(
    formInput: UGCScaffoldFormInput,
    culprit: UGCCharacterFromScaffold
  ): Promise<UGCGeneratedTimeline> {
    const characterDetails = formInput.characters.map(c => ({
      name: c.name,
      role: c.role,
      personalityTraits: c.personalityTraits,
      secret: c.secret,
      isCulprit: c.isCulprit,
    }));

    const prompt = `You are a mystery timeline architect. Create a detailed timeline that integrates ALL character secrets and the crime.

STORY SCAFFOLD:
- Title: ${formInput.scaffold.title}
- Setting: ${formInput.scaffold.setting.location}, ${formInput.scaffold.setting.timePeriod}
- Atmosphere: ${formInput.scaffold.setting.atmosphere}
- Crime Type: ${formInput.scaffold.crimeType}
${formInput.scaffold.victimParagraph || formInput.scaffold.victimContext ? `- Victim: ${formInput.scaffold.victimParagraph || formInput.scaffold.victimContext}` : ''}

CRIME DETAILS (CONFIDENTIAL - timeline must support this):
- Culprit: ${culprit.name} (${culprit.role})
- Motive: ${formInput.crimeDetails.motive}
- Method: ${formInput.crimeDetails.method}

CHARACTERS WITH THEIR SECRETS:
${characterDetails.map(c => `
### ${c.name} (${c.role})
- Personality: ${c.personalityTraits.join(', ')}
- Secret: ${c.secret}
- Is Culprit: ${c.isCulprit}
`).join('\n')}

Generate a JSON object:
{
  "actualEvents": [
    "TIME - Event description showing what happened"
  ],
  "solution": {
    "culprit": "${culprit.name}",
    "method": "Expanded description of the method",
    "motive": "Expanded description of the motive",
    "explanation": "3-4 sentence explanation shown to player after solving"
  }
}

CRITICAL TIMELINE RULES:

1. SECRET MANIFESTATION: Every character's SECRET must influence at least one timeline event
   - If secret is "gambling debt", show them acting suspiciously about money
   - If secret is "affair with victim", show a private moment or suspicious behavior

2. WITNESS MOMENTS: Include moments where characters could observe others
   - "7:15 PM - Sarah passes the study and notices the door ajar"
   - These become the basis for clues during interrogation

3. CULPRIT REQUIREMENTS:
   - Must have an OPPORTUNITY WINDOW (time alone/unobserved near the crime scene)
   - Actions that can CONTRADICT their alibi when witnesses reveal what they saw
   - Alibi must have HOLES that can be exposed

4. INNOCENT CHARACTER REQUIREMENTS:
   - Activities that serve as VERIFIABLE alibis
   - Moments where they OBSERVE something relevant (even unknowingly)

5. STRUCTURE:
   - 8-12 timestamped events
   - Events BEFORE the crime (setup, tensions, movements)
   - The CRIME itself (culprit's opportunity window)
   - Events AFTER (discovery, reactions)

EXAMPLE SECRET-TO-TIMELINE MAPPING:
- Secret: "Thomas has gambling debts"
  → "6:30 PM - Thomas receives a phone call and steps away, looking worried"
  → "7:00 PM - Sarah overhears Thomas arguing about money in the hallway"

- Secret: "Emily was having an affair with the victim"
  → "6:45 PM - Emily is seen leaving the victim's room, looking flustered"
  → "8:30 PM - Emily's reaction to the news seems 'too grief-stricken' to others"

Respond with ONLY the JSON object, no other text.`;

    this.tracePrompt('timeline-from-characters', prompt);

    const { text } = await generateText({
      config: this.config.llm,
      prompt,
      maxTokens: 2500,
      temperature: 0.7,
    });

    return this.parseJSONResponse(text);
  }

  /**
   * Generate character knowledge based on timeline (LLM Call 4)
   * Alibis and knowledge are DERIVED from the timeline, not invented separately
   */
  private async generateCharacterKnowledgeFromTimeline(
    formInput: UGCScaffoldFormInput,
    story: UGCGeneratedStory,
    culprit: UGCCharacterFromScaffold
  ): Promise<UGCGeneratedCharacterKnowledge[]> {
    const characterBasics = formInput.characters.map(c => ({
      tempId: c.tempId,
      name: c.name,
      role: c.role,
      personalityTraits: c.personalityTraits,
      secret: c.secret,
      isCulprit: c.isCulprit,
    }));

    const prompt = `You are generating interrogation-ready character knowledge based on a finalized timeline.

TIMELINE OF EVENTS:
${story.actualEvents.join('\n')}

SOLUTION:
- Culprit: ${story.solution.culprit}
- Method: ${story.solution.method}
- Motive: ${story.solution.motive}

CHARACTERS:
${characterBasics.map(c => `
### ${c.name} (${c.role}) [tempId: ${c.tempId}]
- Personality: ${c.personalityTraits.join(', ')}
- Secret: ${c.secret}
- Is Culprit: ${c.isCulprit}
`).join('\n')}

For EACH character, analyze the timeline and determine:
1. What they DIRECTLY WITNESSED (they were present at the event)
2. What they could have HEARD ABOUT (gossip, aftermath, overheard conversations)
3. What they KNOW about other characters
4. Their ALIBI based on timeline (where they claim to be)

Generate a JSON array:
[
  {
    "characterId": "tempId from above",
    "knowsAboutCrime": "What they directly witnessed or know about the crime from the timeline",
    "knowsAboutOthers": ["Specific info about other characters they could reveal"],
    "alibi": "Their claimed whereabouts during the crime (based on timeline)",
    "behaviorUnderPressure": {
      "defensive": "How they deflect based on personality and secret",
      "whenCaughtLying": "Reaction based on personality",
      "whenAccused": "Response based on guilt status and personality"
    }
  }
]

CRITICAL RULES:

FOR THE GUILTY CHARACTER (${culprit.name}):
- alibi must be FALSE or have VERIFIABLE HOLES based on timeline
- knowsAboutCrime should be VAGUE/DEFLECTING (they're hiding their involvement)
- behaviorUnderPressure should show SUBTLE TELLS (overcompensating, specific denials)

FOR INNOCENT CHARACTERS:
- alibi should be TRUE and match their timeline position
- knowsAboutCrime should include what they ACTUALLY witnessed per timeline
- knowsAboutOthers should include ACTIONABLE info (things that help solve the mystery)
- They may protect their OWN secret but should be honest about the crime

Respond with ONLY the JSON array, no other text.`;

    this.tracePrompt('character-knowledge-from-timeline', prompt);

    const { text } = await generateText({
      config: this.config.llm,
      prompt,
      maxTokens: 3500,
      temperature: 0.7,
    });

    return this.parseJSONResponse(text);
  }

  /**
   * Build full character objects from scaffold input and generated knowledge
   */
  private buildCharactersFromScaffold(
    formInput: UGCScaffoldFormInput,
    knowledge: UGCGeneratedCharacterKnowledge[],
    culprit: UGCCharacterFromScaffold
  ): UGCGeneratedCharacter[] {
    return formInput.characters.map(char => {
      const charKnowledge = knowledge.find(k => k.characterId === char.tempId);
      if (!charKnowledge) {
        throw new Error(`No knowledge generated for character ${char.name}`);
      }

      const id = char.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_');

      return {
        id,
        tempId: char.tempId,
        name: char.name,
        role: char.role,
        age: this.generateAge(char.role),
        isGuilty: char.isCulprit,
        isVictim: false, // No victims in new flow
        personality: {
          traits: char.personalityTraits,
          speechStyle: this.inferSpeechStyle(char.personalityTraits),
          quirks: this.generateQuirks(char.personalityTraits),
        },
        appearance: {
          description: char.appearance,
          imagePrompt: this.buildImagePrompt(char),
        },
        knowledge: {
          knowsAboutCrime: charKnowledge.knowsAboutCrime,
          knowsAboutOthers: charKnowledge.knowsAboutOthers,
          alibi: charKnowledge.alibi,
        },
        // Derive statement from alibi instead of LLM generation
        statement: deriveStatementFromAlibi(char.name, charKnowledge.alibi),
        secrets: [{
          content: char.secret,
          willingnessToReveal: char.isCulprit ? 'never' : 'medium',
          revealCondition: char.isCulprit
            ? 'Only if confronted with undeniable evidence'
            : 'If pressed hard or if it helps clear their name',
        }],
        behaviorUnderPressure: charKnowledge.behaviorUnderPressure,
        relationships: {}, // Will be populated by relationships generation if needed
        imageUrl: char.uploadedImageUrl || undefined,
      };
    });
  }

  /**
   * Generate plot points from scaffold-based data
   */
  private async generatePlotPointsFromScaffold(
    story: UGCGeneratedStory,
    characters: UGCGeneratedCharacter[]
  ): Promise<{
    plotPoints: UGCGeneratedPlotPoint[];
    minimumPointsToAccuse: number;
    perfectScoreThreshold: number;
  }> {
    const characterInfo = characters.map(c => ({
      id: c.id,
      name: c.name,
      role: c.role,
      isGuilty: c.isGuilty,
      knowsAboutCrime: c.knowledge.knowsAboutCrime,
      knowsAboutOthers: c.knowledge.knowsAboutOthers,
      secret: c.secrets[0]?.content,
    }));

    const prompt = `You are creating clues for a detective mystery where ALL information is discovered through CHARACTER INTERROGATION.

TIMELINE OF EVENTS:
${story.actualEvents.join('\n')}

SOLUTION:
- Culprit: ${story.solution.culprit}
- Method: ${story.solution.method}
- Motive: ${story.solution.motive}

CHARACTERS AND WHAT THEY KNOW:
${JSON.stringify(characterInfo, null, 2)}

Create 8-12 plot points (clues) that form a solvable mystery.

{
  "plotPoints": [
    {
      "id": "pp_snake_case_id",
      "category": "motive" | "alibi" | "evidence" | "relationship",
      "description": "What the player learns when this clue is revealed",
      "importance": "low" | "medium" | "high" | "critical",
      "points": 10-30,
      "revealedBy": ["character_id_who_can_reveal"],
      "detectionHints": ["keywords", "phrases", "topics that trigger"]
    }
  ],
  "minimumPointsToAccuse": 50,
  "perfectScoreThreshold": sum_of_all_points
}

CRITICAL RULES:

1. EVERY clue must be assignable to at least one character based on their knowsAboutCrime or knowsAboutOthers
2. Characters can only reveal what they REALISTICALLY know:
   - They witnessed it directly (per timeline)
   - They have expertise to notice it
   - Another character told them
   - They know the culprit/others personally

3. REQUIRED CLUES (minimum):
   - 2+ MOTIVE clues pointing to why culprit did it
   - 2+ ALIBI clues exposing holes in culprit's story
   - 1+ OPPORTUNITY clue showing culprit could do it
   - 2+ CORROBORATION clues supporting the solution

4. Detection hints should include:
   - Direct question keywords ("where were you", "what did you see")
   - Topic triggers ("that night", "alibi", "relationship")
   - Character names (asking about them might reveal info)

5. Each clue's description should be ACTIONABLE information that helps solve the mystery

Respond with ONLY the JSON object, no other text.`;

    this.tracePrompt('plot-points-from-scaffold', prompt);

    const { text } = await generateText({
      config: this.config.llm,
      prompt,
      maxTokens: 3000,
      temperature: 0.7,
    });

    return this.parseJSONResponse(text);
  }

  // Helper methods for character building
  private calculateDifficulty(numCharacters: number): 'easy' | 'medium' | 'hard' {
    if (numCharacters <= 3) return 'easy';
    if (numCharacters <= 4) return 'medium';
    return 'hard';
  }

  private generateAge(role: string): number {
    // Generate appropriate age based on role
    const roleLower = role.toLowerCase();
    if (roleLower.includes('young') || roleLower.includes('intern') || roleLower.includes('assistant')) {
      return 22 + Math.floor(Math.random() * 8);
    }
    if (roleLower.includes('elderly') || roleLower.includes('retired') || roleLower.includes('grandmother')) {
      return 60 + Math.floor(Math.random() * 20);
    }
    return 30 + Math.floor(Math.random() * 25);
  }

  private inferSpeechStyle(traits: string[]): string {
    const traitsLower = traits.map(t => t.toLowerCase());
    if (traitsLower.some(t => t.includes('formal') || t.includes('elegant'))) {
      return 'Formal and measured, chooses words carefully';
    }
    if (traitsLower.some(t => t.includes('nervous') || t.includes('anxious'))) {
      return 'Hesitant, often trails off, speaks quickly when stressed';
    }
    if (traitsLower.some(t => t.includes('charming') || t.includes('smooth'))) {
      return 'Confident and persuasive, uses flattery';
    }
    if (traitsLower.some(t => t.includes('cold') || t.includes('calculating'))) {
      return 'Direct and emotionless, clinical word choice';
    }
    return 'Conversational, adapts to the situation';
  }

  private generateQuirks(traits: string[]): string[] {
    const quirks: string[] = [];
    const traitsLower = traits.map(t => t.toLowerCase());

    if (traitsLower.some(t => t.includes('nervous'))) {
      quirks.push('Fidgets with hands when lying');
    }
    if (traitsLower.some(t => t.includes('arrogant'))) {
      quirks.push('Tends to talk down to others');
    }
    if (traitsLower.some(t => t.includes('secretive'))) {
      quirks.push('Avoids eye contact when discussing sensitive topics');
    }

    // Add generic quirks if we don't have enough
    const genericQuirks = [
      'Pauses before answering difficult questions',
      'Has a habit of deflecting with humor',
      'Becomes more formal when uncomfortable',
    ];

    while (quirks.length < 2) {
      const randomQuirk = genericQuirks[Math.floor(Math.random() * genericQuirks.length)];
      if (!quirks.includes(randomQuirk)) {
        quirks.push(randomQuirk);
      }
    }

    return quirks.slice(0, 2);
  }

  private buildImagePrompt(char: UGCCharacterFromScaffold): string {
    return `Portrait of ${char.name}, ${char.role}. ${char.appearance}. Personality: ${char.personalityTraits.join(', ')}. Professional headshot style, detailed face, high quality.`;
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
   * @deprecated Roleplay prompts are now generated on-the-fly in the chat route.
   * This method is a no-op.
   */
  private generateRoleplayPrompts(
    _characters: UGCGeneratedCharacter[],
    _storyDir: string
  ): void {
    console.log('[UGCEngine] generateRoleplayPrompts is deprecated - prompts generated on-the-fly');
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
  /**
   * @deprecated Stories are now stored in Supabase. This method is a no-op.
   */
  createStoryDirectory(_storyId: string): string {
    console.log('[UGCEngine] createStoryDirectory is deprecated - stories are stored in Supabase');
    return '';
  }

  /**
   * @deprecated Stories are now stored in Supabase. This method is a no-op.
   */
  private deleteStoryDirectory(_storyId: string): void {
    console.log('[UGCEngine] deleteStoryDirectory is deprecated - stories are stored in Supabase');
  }

  /**
   * @deprecated Stories are now stored in Supabase. This method is a no-op.
   */
  saveJSON(_storyDir: string, _filename: string, _data: unknown): void {
    console.log('[UGCEngine] saveJSON is deprecated - stories are stored in Supabase');
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
   * @deprecated Images are now uploaded to Supabase Storage. This method is a no-op.
   */
  private async downloadImage(_url: string, _outputPath: string): Promise<void> {
    console.log('[UGCEngine] downloadImage is deprecated - images are stored in Supabase Storage');
  }

  /**
   * @deprecated Stories are now stored in Supabase. This method is a no-op.
   */
  addToStoriesConfig(_storyId: string, _title: string): void {
    // No-op: Stories are now stored in Supabase, not stories.config.json
    console.log('[UGCEngine] addToStoriesConfig is deprecated - stories are stored in Supabase');
  }

  // ==========================================================================
  // NEW FLOW v2: Foundation-Based Generation (UGC Pipeline Redesign)
  // ==========================================================================

  /**
   * Helper to create progress events
   */
  private createProgressEvent(
    step: FleshOutProgressEvent['step'],
    message: string,
    progress: number
  ): FleshOutProgressEvent {
    return { type: 'progress', step, message, progress };
  }

  /**
   * Main entry point for the new foundation-based flow (CLUES-FIRST).
   * Takes minimal foundation data + character sketches + culprit info and generates:
   * - Full character details with images
   * - Clues (for solvability - generated BEFORE timeline)
   * - Timeline (to support clues - internal implementation detail)
   * - Character knowledge (aligned with clues)
   *
   * Key insight: Clues are the "contract" (what must be discoverable).
   * Timeline is the "implementation" (how those clues came to exist).
   */
  async fleshOutAndGenerate(
    request: FleshOutRequest,
    onProgress: (event: FleshOutProgressEvent) => void
  ): Promise<FleshOutResponse> {
    this.resetPromptTraces();

    const { foundation, characters, culprit } = request;
    const storyId = this.generateStoryIdFromTitle(foundation.title);

    // Validate culprit exists
    if (!characters.some(c => c.id === culprit.characterId)) {
      throw new Error('Culprit character not found in character list');
    }

    // Build solution object from culprit info
    const culpritChar = characters.find(c => c.id === culprit.characterId);
    const solution: UGCSolution = {
      culprit: culpritChar?.name || 'Unknown',
      method: culprit.method,
      motive: culprit.motive,
      explanation: `${culpritChar?.name || 'The culprit'} committed the ${foundation.crimeType} because ${culprit.motive}. They used ${culprit.method} to carry out the crime.`,
    };

    // Step 1: Generate full character details (0% → 20%)
    onProgress(this.createProgressEvent('characters', 'Generating character appearances and personalities...', 0));
    const fleshedOutCharacters = await this.generateFullCharacterDetails(foundation, characters, culprit);
    onProgress(this.createProgressEvent('characters', 'Character details generated', 20));

    // Step 2: Generate clues for solvability (20% → 40%) - CLUES FIRST!
    onProgress(this.createProgressEvent('clues', 'Designing mystery clues...', 20));
    const { clues, scoring } = await this.generateCluesForSolvability(foundation, fleshedOutCharacters, solution);
    onProgress(this.createProgressEvent('clues', 'Clues designed', 40));

    // Step 3: Generate timeline to support clues (40% → 60%)
    onProgress(this.createProgressEvent('timeline', 'Building story timeline to support clues...', 40));
    const timeline = await this.generateTimelineFromClues({
      clues,
      characters: fleshedOutCharacters,
      solution,
      setting: foundation.setting,
    });
    onProgress(this.createProgressEvent('timeline', 'Timeline created', 60));

    // Step 4: Generate character knowledge (60% → 75%)
    // Pass clues so character knowledge aligns with who reveals what
    onProgress(this.createProgressEvent('knowledge', 'Deriving what each character knows...', 60));
    const charactersWithKnowledge = await this.addCharacterKnowledge(fleshedOutCharacters, timeline, solution, clues);
    onProgress(this.createProgressEvent('knowledge', 'Character knowledge derived', 75));

    // Step 5: Generate character images (75% → 100%)
    onProgress(this.createProgressEvent('images', 'Generating character portraits...', 75));
    const charactersWithImages = await this.generateCharacterImagesForFleshOut(charactersWithKnowledge, foundation.setting);
    onProgress(this.createProgressEvent('images', 'Generation complete!', 100));

    return {
      storyId,
      characters: charactersWithImages,
      clues,
      timeline,
      solution,
      scoring,
    };
  }

  /**
   * Flesh out characters ONLY - for staged generation flow
   * Skips clues, timeline, and knowledge generation (done later after user edits)
   */
  async fleshOutCharactersOnly(
    request: FleshOutRequest,
    onProgress: (event: FleshOutProgressEvent) => void
  ): Promise<{
    storyId: string;
    characters: UGCGeneratedCharacter[];
    solution: UGCSolution;
  }> {
    this.resetPromptTraces();

    const { foundation, characters, culprit } = request;
    const storyId = this.generateStoryIdFromTitle(foundation.title);

    // Validate culprit exists
    if (!characters.some(c => c.id === culprit.characterId)) {
      throw new Error('Culprit character not found in character list');
    }

    // Build solution object from culprit info
    const culpritChar = characters.find(c => c.id === culprit.characterId);
    const solution: UGCSolution = {
      culprit: culpritChar?.name || 'Unknown',
      method: culprit.method,
      motive: culprit.motive,
      explanation: `${culpritChar?.name || 'The culprit'} committed the ${foundation.crimeType} because ${culprit.motive}. They used ${culprit.method} to carry out the crime.`,
    };

    // Step 1: Generate full character details (0% → 50%)
    onProgress(this.createProgressEvent('characters', 'Generating character appearances and personalities...', 0));
    const fleshedOutCharacters = await this.generateFullCharacterDetails(foundation, characters, culprit);
    onProgress(this.createProgressEvent('characters', 'Character details generated', 50));

    // Step 2: Generate character images (50% → 100%)
    onProgress(this.createProgressEvent('images', 'Generating character portraits...', 50));
    const charactersWithImages = await this.generateCharacterImagesForFleshOut(fleshedOutCharacters, foundation.setting);
    onProgress(this.createProgressEvent('images', 'Generation complete!', 100));

    return {
      storyId,
      characters: charactersWithImages,
      solution,
    };
  }

  /**
   * Generate full character details from minimal foundation input
   */
  private async generateFullCharacterDetails(
    foundation: UGCFoundation,
    characters: UGCFoundationCharacter[],
    culprit: CulpritInfo
  ): Promise<UGCGeneratedCharacter[]> {
    const characterList = characters.map(c => ({
      id: c.id,
      name: c.name,
      role: c.role,
      connectionHint: c.connectionHint,
      isCulprit: c.id === culprit.characterId,
    }));

    const prompt = `You are a character designer for a mystery game. Generate detailed character profiles based on minimal sketches.

STORY FOUNDATION:
- Title: ${foundation.title}
- Synopsis: ${foundation.synopsis}
- Setting: ${foundation.setting.location}, ${foundation.setting.timePeriod}
- Atmosphere: ${foundation.setting.atmosphere}
- Crime Type: ${foundation.crimeType}
- Victim: ${foundation.victimParagraph}

CRIME DETAILS:
- Culprit: The character marked as isCulprit
- Motive: ${culprit.motive}
- Method: ${culprit.method}

CHARACTER SKETCHES:
${JSON.stringify(characterList, null, 2)}

For EACH character, generate a complete profile. Output a JSON array:
[
  {
    "id": "original_character_id",
    "tempId": "original_character_id",
    "name": "Character name",
    "role": "Their role",
    "age": appropriate_age_number,
    "isGuilty": true_if_culprit_false_otherwise,
    "isVictim": false,
    "personality": {
      "traits": [],
      "speechStyle": "How they speak - formal, nervous, confident, etc.",
      "quirks": ["2 behavioral quirks or mannerisms"]
    },
    "appearance": {
      "description": "2-3 sentences describing their appearance fitting the setting and era",
      "imagePrompt": "Detailed AI image generation prompt for a portrait"
    },
    "secrets": [
      {
        "content": "A secret this character has (related to crime for culprit, personal for others)",
        "willingnessToReveal": "low" | "medium" | "high" | "never",
        "revealCondition": "What would make them reveal this"
      }
    ],
    "behaviorUnderPressure": {
      "defensive": "How they act when feeling defensive",
      "whenCaughtLying": "How they react when caught in a lie",
      "whenAccused": "How they respond to direct accusation"
    },
    "relationships": {
      "other_character_id": "Their relationship to that character"
    }
  }
]

CRITICAL RULES:
1. The culprit's secret MUST relate to the crime and motive
2. Each character should have a unique personality and appearance fitting the era
3. Appearance descriptions should be vivid and specific for portrait generation
4. Secrets should create interesting interrogation dynamics
5. The image prompt should describe: age, gender, clothing style, expression, era-appropriate details

Respond with ONLY the JSON array.`;

    this.tracePrompt('flesh-out-characters', prompt);

    const { text } = await generateText({
      config: this.config.llm,
      prompt,
      maxTokens: 4000,
      temperature: 0.7,
    });

    const generated = this.parseJSONResponse(text);

    // Ensure we have all required fields and merge with original data
    return generated.map((char: Partial<UGCGeneratedCharacter>) => ({
      id: char.id || '',
      tempId: char.tempId || char.id || '',
      name: char.name || '',
      role: char.role || '',
      age: char.age || 30,
      isGuilty: char.isGuilty || false,
      isVictim: char.isVictim || false,
      personality: char.personality || { traits: [], speechStyle: '', quirks: [] },
      appearance: char.appearance || { description: '', imagePrompt: '' },
      knowledge: { knowsAboutCrime: '', knowsAboutOthers: [], alibi: '' }, // Will be filled later
      statement: '', // Will be filled later
      secrets: char.secrets || [],
      behaviorUnderPressure: char.behaviorUnderPressure || { defensive: '', whenCaughtLying: '', whenAccused: '' },
      relationships: char.relationships || {},
    }));
  }

  /**
   * Generate timeline and solution from character details and crime info
   */
  private async generateTimelineAndSolution(
    foundation: UGCFoundation,
    characters: UGCGeneratedCharacter[],
    culprit: CulpritInfo
  ): Promise<{ timeline: string[]; solution: UGCSolution }> {
    const culpritChar = characters.find(c => c.id === culprit.characterId);

    const prompt = `You are a mystery plot architect. Create a detailed timeline of events for this mystery.

STORY FOUNDATION:
- Title: ${foundation.title}
- Setting: ${foundation.setting.location}, ${foundation.setting.timePeriod}
- Crime Type: ${foundation.crimeType}
- Victim: ${foundation.victimParagraph}

CRIME DETAILS:
- Culprit: ${culpritChar?.name} (${culpritChar?.role})
- Motive: ${culprit.motive}
- Method: ${culprit.method}

CHARACTERS:
${characters.map(c => `- ${c.name} (${c.role}): ${c.personality.traits.join(', ')}
  Secret: ${c.secrets[0]?.content || 'None specified'}`).join('\n')}

Generate a JSON object:
{
  "timeline": [
    "TIME - Event description showing what happened",
    "Include 8-12 timestamped events",
    "Show movements of all characters",
    "Include the crime itself",
    "End with discovery"
  ],
  "solution": {
    "culprit": "${culpritChar?.name}",
    "method": "Detailed description of how they committed the crime",
    "motive": "Full explanation of why they did it",
    "explanation": "3-4 sentence explanation for the player reveal, connecting all evidence"
  }
}

TIMELINE RULES:
1. Every character's secret should influence at least one event
2. Show the culprit's OPPORTUNITY WINDOW (time alone near crime scene)
3. Create WITNESS MOMENTS where other characters see something relevant
4. Innocent characters should have VERIFIABLE activities
5. The timeline should make the mystery SOLVABLE through interrogation

Respond with ONLY the JSON object.`;

    this.tracePrompt('generate-timeline-solution', prompt);

    const { text } = await generateText({
      config: this.config.llm,
      prompt,
      maxTokens: 2500,
      temperature: 0.7,
    });

    const result = this.parseJSONResponse(text);
    return {
      timeline: result.timeline || [],
      solution: result.solution || { culprit: '', method: '', motive: '', explanation: '' },
    };
  }

  /**
   * Generate clues without categories for the new flow
   */
  private async generateCluesWithoutCategories(
    foundation: UGCFoundation,
    characters: UGCGeneratedCharacter[],
    timeline: string[],
    solution: UGCSolution
  ): Promise<{ clues: UGCGeneratedClue[]; scoring: { minimumPointsToAccuse: number; perfectScoreThreshold: number } }> {
    // Filter out victims
    const interactableCharacters = characters.filter(c => !c.isVictim);

    const prompt = `You are creating clues for a detective mystery game. The ONLY way to discover information is through CHARACTER INTERROGATION.

STORY:
- Title: ${foundation.title}
- Setting: ${foundation.setting.location}
- Solution: ${solution.culprit} committed ${foundation.crimeType} because ${solution.motive}
- Method: ${solution.method}

TIMELINE:
${timeline.join('\n')}

CHARACTERS WHO CAN BE INTERROGATED:
${interactableCharacters.map(c => `- ${c.id}: ${c.name} (${c.role})`).join('\n')}

Create 8-12 clues that form a solvable mystery. Generate a JSON object:
{
  "clues": [
    {
      "id": "clue_snake_case_id",
      "description": "What the player learns when this clue is revealed",
      "points": 10-30,
      "revealedBy": ["character_id_who_knows_this"],
      "detectionHints": ["keywords", "phrases", "topics that trigger this clue"]
    }
  ],
  "minimumPointsToAccuse": 50,
  "perfectScoreThreshold": calculated_total_of_all_points
}

CLUE GENERATION RULES:
1. EVERY clue MUST be assigned to at least one LIVING character who can reveal it
2. Characters can only reveal clues they would realistically know from the timeline
3. Include clues that:
   - Point to the culprit's motive (at least 2)
   - Expose the culprit's false alibi (at least 1-2)
   - Show the culprit's opportunity (at least 1)
   - Provide corroborating evidence (at least 2)
4. Critical clues pointing to the culprit should be worth more points (25-30)
5. Total possible points should be around 150-200

DETECTION HINTS should include:
- Direct question keywords ("where were you", "what did you see")
- Topic triggers ("alibi", "that night", "relationship")
- Character name mentions

Respond with ONLY the JSON object.`;

    this.tracePrompt('generate-clues-no-categories', prompt);

    const { text } = await generateText({
      config: this.config.llm,
      prompt,
      maxTokens: 3000,
      temperature: 0.7,
    });

    const result = this.parseJSONResponse(text);
    return {
      clues: result.clues || [],
      scoring: {
        minimumPointsToAccuse: result.minimumPointsToAccuse || 50,
        perfectScoreThreshold: result.perfectScoreThreshold || 150,
      },
    };
  }

  /**
   * Generate clues for mystery solvability WITHOUT a timeline (clues-first flow)
   * Clues are based on characters, their secrets, and the solution
   * The key insight: Clues are the "contract" (what must be discoverable)
   * Timeline is the "implementation" (how those clues came to exist)
   */
  async generateCluesForSolvability(
    foundation: UGCFoundation,
    characters: UGCGeneratedCharacter[],
    solution: UGCSolution
  ): Promise<{ clues: UGCGeneratedClue[]; scoring: { minimumPointsToAccuse: number; perfectScoreThreshold: number } }> {
    // Filter out victims - they can't reveal clues during interrogation
    const interactableCharacters = characters.filter(c => !c.isVictim);
    const culprit = characters.find(c => c.isGuilty);

    // Build character info section including their secrets
    const characterInfoSection = interactableCharacters.map(c => {
      const secretInfo = c.secrets.length > 0 ? c.secrets[0].content : 'No specific secret';
      return `- ${c.id}: ${c.name} (${c.role})
    Secret: ${secretInfo}
    Is Culprit: ${c.isGuilty}`;
    }).join('\n');

    const prompt = `You are designing clues for a mystery game. Generate clues that would allow a detective to solve this mystery through character interrogation.

STORY FOUNDATION:
- Title: ${foundation.title}
- Setting: ${foundation.setting.location}, ${foundation.setting.timePeriod}
- Crime Type: ${foundation.crimeType}
- Victim: ${foundation.victimParagraph}

SOLUTION TO PROVE:
- Culprit: ${culprit?.name || solution.culprit} (${culprit?.role || 'unknown'})
- Method: ${solution.method}
- Motive: ${solution.motive}

CHARACTERS AND THEIR SECRETS:
${characterInfoSection}

Generate 8-12 clues that would allow a detective to solve this mystery.

CLUE REQUIREMENTS BY CATEGORY:
1. MOTIVE CLUES (2+ required) - Why the culprit did it
   - Financial troubles, relationship issues, grudges, etc.
   - Revealed by characters who witnessed or know about the motive

2. ALIBI CLUES (2+ required) - Holes in culprit's story
   - Contradictions in their timeline
   - Witnesses who saw them elsewhere
   - Physical evidence disproving claims

3. OPPORTUNITY CLUES (1+ required) - Culprit had access/means
   - Access to the crime scene
   - Possession of murder weapon or tools
   - Knowledge only the perpetrator would have

4. CORROBORATION CLUES (2+ required) - Supporting evidence
   - Physical evidence (footprints, fingerprints, items)
   - Witness statements that connect pieces
   - Documents, letters, or records

For each clue, assign revealedBy based on:
- Who would LOGICALLY know this given their role and position?
- Who has a related secret that connects to this information?
- Who would have been nearby or involved in the relevant events?

Output a JSON object:
{
  "clues": [
    {
      "id": "clue_snake_case_id",
      "description": "What the player learns when this clue is revealed",
      "points": 10-30,
      "revealedBy": ["character_ids_who_can_reveal_this"],
      "detectionHints": ["keywords", "phrases", "topics that trigger this clue"]
    }
  ],
  "minimumPointsToAccuse": 50,
  "perfectScoreThreshold": calculated_total_of_all_points
}

RULES:
1. EVERY clue MUST be assigned to at least one LIVING character who can reveal it
2. Critical clues should be worth more points (25-30), supporting clues less (10-15)
3. Total possible points should be around 150-200
4. Detection hints should include keywords like "where were you", "alibi", "that night", character names
5. revealedBy should be character IDs (like char_xxx), not names
6. Clues are what characters OBSERVED or KNOW - they don't know who the killer is, so clues are factual observations

Respond with ONLY the JSON object.`;

    this.tracePrompt('generate-clues-for-solvability', prompt);

    const { text } = await generateText({
      config: this.config.llm,
      prompt,
      maxTokens: 3000,
      temperature: 0.7,
    });

    const result = this.parseJSONResponse(text);
    return {
      clues: result.clues || [],
      scoring: {
        minimumPointsToAccuse: result.minimumPointsToAccuse || 50,
        perfectScoreThreshold: result.perfectScoreThreshold || 150,
      },
    };
  }

  /**
   * Generate timeline from clues (for initial generation in clues-first flow)
   * This is the internal method - the public one is regenerateTimelineFromClues
   */
  async generateTimelineFromClues(request: RegenerateTimelineRequest): Promise<string[]> {
    return this.regenerateTimelineFromClues(request);
  }

  /**
   * Add knowledge to characters based on timeline and clues
   * IMPORTANT: Clues define who reveals what, so character knowledge must align
   */
  async addCharacterKnowledge(
    characters: UGCGeneratedCharacter[],
    timeline: string[],
    solution: UGCSolution,
    clues: UGCGeneratedClue[] = []
  ): Promise<UGCGeneratedCharacter[]> {
    // Build clue alignment section only if clues are provided
    const clueAlignmentSection = clues.length > 0 ? `
CLUES AND WHO REVEALS THEM:
${clues.map(clue => `- "${clue.description}" → Revealed by: ${clue.revealedBy.join(', ')}`).join('\n')}

CRITICAL - CLUE ALIGNMENT:
6. For each clue, look at who reveals it (revealedBy)
7. Those characters MUST have related knowledge in knowsAboutOthers or knowsAboutCrime
8. Example: If clue "Saw gardener near shed at 9pm" is revealed by char_lord,
   then char_lord's knowsAboutOthers must include info about seeing the gardener
9. This ensures gameplay consistency - characters can only reveal what they know
` : '';

    const prompt = `Derive what each character knows based on the timeline of events.

TIMELINE:
${timeline.join('\n')}

SOLUTION:
- Culprit: ${solution.culprit}
- Method: ${solution.method}
- Motive: ${solution.motive}

CHARACTERS:
${characters.map(c => `- ${c.id}: ${c.name} (${c.role}) - Guilty: ${c.isGuilty}`).join('\n')}
${clueAlignmentSection}
Generate a JSON object with a "characters" array containing each character's knowledge:
{
  "characters": [
    {
      "characterId": "char_xxx",
      "knowsAboutCrime": "What they directly witnessed or know about the crime",
      "knowsAboutOthers": ["Info they have about other characters from timeline"],
      "alibi": "Where they claim to have been (FALSE for culprit, TRUE for innocents)"
    }
  ]
}

RULES:
1. Include ALL characters listed above in the response
2. Culprit's alibi MUST have holes or be verifiably false
3. Innocent characters should have TRUE, verifiable alibis
4. Each character should know something useful based on timeline events they witnessed
5. knowsAboutOthers should be information they could reveal during interrogation`;

    this.tracePrompt('add-character-knowledge', prompt);

    // Use structured outputs for guaranteed valid, typed JSON
    const llmClient = new LLMClient(this.config.llm);
    const response = await llmClient.generateJSON<CharacterKnowledgeResponse>(prompt, {
      schema: CharacterKnowledgeSchema,
      maxTokens: 2500,
      temperature: 0.7,
    });

    // Convert array response to map for easier lookup
    const knowledgeMap = new Map(
      response.characters.map(k => [k.characterId, k])
    );

    return characters.map(char => {
      const knowledge = knowledgeMap.get(char.id);
      if (!knowledge) return char;

      return {
        ...char,
        knowledge: {
          knowsAboutCrime: knowledge.knowsAboutCrime,
          knowsAboutOthers: knowledge.knowsAboutOthers,
          alibi: knowledge.alibi,
        },
        // Derive statement from alibi instead of LLM generation
        statement: deriveStatementFromAlibi(char.name, knowledge.alibi),
      };
    });
  }

  /**
   * Generate character images for the flesh-out flow (parallel for speed)
   */
  private async generateCharacterImagesForFleshOut(
    characters: UGCGeneratedCharacter[],
    setting: { location: string; timePeriod: string; atmosphere?: string }
  ): Promise<UGCGeneratedCharacter[]> {
    if (!this.config.image.apiKey) {
      console.warn('IMAGE_API_KEY not configured, skipping character images');
      return characters;
    }

    const imageClient = new ImageClient(this.config.image);

    // Generate images in parallel for all characters that need them
    const imagePromises = characters.map(async (character): Promise<UGCGeneratedCharacter> => {
      // Skip if character already has an image
      if (character.imageUrl) {
        return character;
      }

      try {
        const result = await imageClient.generatePortrait(character.appearance.imagePrompt);
        return { ...character, imageUrl: result.url };
      } catch (error) {
        console.warn(`Failed to generate portrait for ${character.name}:`, error);
        return character;
      }
    });

    return Promise.all(imagePromises);
  }

  /**
   * Regenerate timeline from edited clues (reverse flow for new UX)
   * Takes edited clues and generates a coherent timeline that supports them
   */
  async regenerateTimelineFromClues(request: RegenerateTimelineRequest): Promise<string[]> {
    const { clues, characters, solution, setting } = request;

    // Filter out victims
    const interactableCharacters = characters.filter(c => !c.isVictim);

    const prompt = `You are regenerating a mystery timeline to be coherent with the edited clues.

SETTING:
- Location: ${setting.location}
- Time Period: ${setting.timePeriod}

SOLUTION:
- Culprit: ${solution.culprit}
- Method: ${solution.method}
- Motive: ${solution.motive}

CHARACTERS:
${interactableCharacters.map(c => `- ${c.name} (${c.role})`).join('\n')}

CLUES THAT MUST BE SUPPORTED BY TIMELINE:
${clues.map(c => `- "${c.description}" (revealed by: ${c.revealedBy.map(id => {
  const char = characters.find(ch => ch.id === id);
  return char?.name || id;
}).join(', ')})`).join('\n')}

Generate a NEW timeline that:
1. Creates events that explain how each character knows the clues they can reveal
2. Shows the culprit's opportunity to commit the crime
3. Provides alibis for innocent characters
4. Makes the clues logically discoverable through interrogation

Output a JSON array of 8-12 timestamped events:
["TIME - Event description", ...]

Respond with ONLY the JSON array.`;

    this.tracePrompt('regenerate-timeline-from-clues', prompt);

    const { text } = await generateText({
      config: this.config.llm,
      prompt,
      maxTokens: 2000,
      temperature: 0.7,
    });

    return this.parseJSONResponse(text);
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
