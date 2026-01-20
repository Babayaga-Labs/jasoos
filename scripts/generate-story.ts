/**
 * Story Generation Script
 *
 * Usage:
 *   npx tsx scripts/generate-story.ts <story-id>
 *
 * This script reads a synopsis from stories/<story-id>/synopsis.txt
 * and generates:
 *   - story.json (plot, setting, solution)
 *   - characters.json (full character definitions)
 *   - plot-points.json (evidence to uncover)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

import { loadAIConfig, LLMClient } from '../packages/ai';

const STORIES_DIR = path.join(process.cwd(), 'stories');

async function main() {
  const storyId = process.argv[2];

  if (!storyId) {
    console.log('Usage: npx tsx scripts/generate-story.ts <story-id>');
    console.log('');
    console.log('First, create a folder and synopsis:');
    console.log('  mkdir stories/my-story');
    console.log('  echo "Your synopsis here..." > stories/my-story/synopsis.txt');
    console.log('');
    console.log('Then run:');
    console.log('  npx tsx scripts/generate-story.ts my-story');
    process.exit(1);
  }

  const storyDir = path.join(STORIES_DIR, storyId);
  const synopsisPath = path.join(storyDir, 'synopsis.txt');

  // Check if synopsis exists
  if (!fs.existsSync(synopsisPath)) {
    console.error(`❌ Synopsis not found: ${synopsisPath}`);
    console.log('');
    console.log('Create a synopsis.txt file with your story premise first.');
    process.exit(1);
  }

  const synopsis = fs.readFileSync(synopsisPath, 'utf-8').trim();
  console.log('📖 Synopsis loaded:');
  console.log('─'.repeat(50));
  console.log(synopsis);
  console.log('─'.repeat(50));
  console.log('');

  // Initialize LLM client
  const config = loadAIConfig();
  if (!config.llm.apiKey) {
    console.error('❌ LLM_API_KEY not set in .env.local');
    process.exit(1);
  }

  const llm = new LLMClient(config.llm);

  // Step 1: Generate story structure
  console.log('🎭 Generating story structure...');
  const story = await generateStory(llm, synopsis, storyId);
  fs.writeFileSync(
    path.join(storyDir, 'story.json'),
    JSON.stringify(story, null, 2)
  );
  console.log('✅ story.json created');

  // Step 2: Generate characters
  console.log('👥 Generating characters...');
  const characters = await generateCharacters(llm, synopsis, story);
  fs.writeFileSync(
    path.join(storyDir, 'characters.json'),
    JSON.stringify({ characters }, null, 2)
  );
  console.log('✅ characters.json created');

  // Step 3: Generate plot points
  console.log('🔍 Generating plot points...');
  const plotPoints = await generatePlotPoints(llm, story, characters);
  fs.writeFileSync(
    path.join(storyDir, 'plot-points.json'),
    JSON.stringify(plotPoints, null, 2)
  );
  console.log('✅ plot-points.json created');

  // Create assets directory
  const assetsDir = path.join(storyDir, 'assets', 'characters');
  fs.mkdirSync(assetsDir, { recursive: true });

  console.log('');
  console.log('🎉 Story generation complete!');
  console.log(`   Location: ${storyDir}`);
  console.log('');
  console.log('Next steps:');
  console.log('1. Review and edit the generated JSON files');
  console.log('2. Add to stories.config.json to enable');
  console.log('3. Generate images: npx tsx scripts/generate-images.ts ' + storyId);
}

async function generateStory(llm: LLMClient, synopsis: string, storyId: string) {
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

  const response = await llm.generate(prompt, { maxTokens: 2000, temperature: 0.7 });

  return JSON.parse(response.content);
}

async function generateCharacters(llm: LLMClient, synopsis: string, story: any) {
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

  const response = await llm.generate(prompt, { maxTokens: 4000, temperature: 0.7 });

  return JSON.parse(response.content);
}

async function generatePlotPoints(llm: LLMClient, story: any, characters: any[]) {
  const characterNames = characters.map(c => `${c.id} (${c.name})`).join(', ');
  const guiltyChar = characters.find(c => c.isGuilty);

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

  const response = await llm.generate(prompt, { maxTokens: 3000, temperature: 0.7 });

  return JSON.parse(response.content);
}

main().catch(console.error);
