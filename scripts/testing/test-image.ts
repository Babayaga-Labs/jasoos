/**
 * Test image generation
 * Usage: npx tsx scripts/testing/test-image.ts [prompt]
 */

import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { loadAIConfig, ImageClient } from '../../packages/ai';

async function main() {
  const config = loadAIConfig();

  console.log('Image Configuration:');
  console.log(`  Provider: ${config.image.provider}`);
  console.log(`  Portrait Model: ${config.image.portraitModel}`);
  console.log(`  Scene Model: ${config.image.sceneModel}`);
  console.log(`  API Key: ${config.image.apiKey ? '✅ Set' : '❌ Missing'}`);
  console.log('');

  if (!config.image.apiKey) {
    console.error('Set IMAGE_API_KEY in .env.local');
    process.exit(1);
  }

  const prompt = process.argv[2] || 'A mysterious detective in a dark alley, noir style, dramatic lighting';

  console.log(`Prompt: "${prompt}"`);
  console.log('');
  console.log('Generating image...');

  const client = new ImageClient(config.image);
  const result = await client.generatePortrait(prompt);

  console.log('');
  console.log('✅ Image generated!');
  console.log('URL:', result.url);
  console.log('Model:', result.model);

  // Download to test output
  const outputPath = 'scripts/testing/test-output.png';
  const response = await fetch(result.url);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
  console.log(`Saved to: ${outputPath}`);
}

main().catch(console.error);
