/**
 * Image Generation Script
 *
 * Usage:
 *   npx tsx scripts/generate-images.ts <story-id>
 *
 * Generates character portraits and scene images using Fal.ai
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

import { loadAIConfig, ImageClient } from '../packages/ai';

const STORIES_DIR = path.join(process.cwd(), 'stories');

async function main() {
  const storyId = process.argv[2];

  if (!storyId) {
    console.log('Usage: npx tsx scripts/generate-images.ts <story-id>');
    process.exit(1);
  }

  const storyDir = path.join(STORIES_DIR, storyId);
  const storyPath = path.join(storyDir, 'story.json');
  const charactersPath = path.join(storyDir, 'characters.json');

  // Check files exist
  if (!fs.existsSync(storyPath) || !fs.existsSync(charactersPath)) {
    console.error('❌ story.json or characters.json not found');
    console.log('Run generate-story.ts first');
    process.exit(1);
  }

  const story = JSON.parse(fs.readFileSync(storyPath, 'utf-8'));
  const { characters } = JSON.parse(fs.readFileSync(charactersPath, 'utf-8'));

  // Initialize image client
  const config = loadAIConfig();
  if (!config.image.apiKey) {
    console.error('❌ IMAGE_API_KEY not set in .env.local');
    process.exit(1);
  }

  console.log(`🎨 Using ${config.image.provider} for image generation`);
  console.log('');

  const imageClient = new ImageClient(config.image);

  // Create assets directories
  const assetsDir = path.join(storyDir, 'assets');
  const charactersDir = path.join(assetsDir, 'characters');
  fs.mkdirSync(charactersDir, { recursive: true });

  // Generate scene image
  console.log('🏠 Generating scene image...');
  const scenePrompt = `${story.setting.location}, ${story.setting.timePeriod}, ${story.setting.atmosphere}, cinematic wide shot, dramatic lighting, detailed environment, atmospheric`;

  try {
    const sceneResult = await imageClient.generateScene(scenePrompt);
    const scenePath = path.join(assetsDir, 'scene.png');
    await downloadImage(sceneResult.url, scenePath);
    console.log(`✅ Scene saved: ${scenePath}`);
  } catch (error) {
    console.error('❌ Scene generation failed:', error);
  }

  // Generate character portraits
  console.log('');
  console.log('👥 Generating character portraits...');

  for (const character of characters) {
    console.log(`   Generating: ${character.name}...`);

    try {
      const result = await imageClient.generatePortrait(character.appearance.imagePrompt);
      const portraitPath = path.join(charactersDir, `${character.id}.png`);
      await downloadImage(result.url, portraitPath);
      console.log(`   ✅ ${character.name} saved`);
    } catch (error) {
      console.error(`   ❌ ${character.name} failed:`, error);
    }
  }

  console.log('');
  console.log('🎉 Image generation complete!');
  console.log(`   Location: ${assetsDir}`);
}

async function downloadImage(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
}

main().catch(console.error);
