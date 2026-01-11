/**
 * Test LLM connection
 * Usage: npx tsx scripts/testing/test-llm.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { generateText, loadAIConfig } from '../../packages/ai';

async function main() {
  const config = loadAIConfig();

  console.log('LLM Configuration:');
  console.log(`  Provider: ${config.llm.provider}`);
  console.log(`  Model: ${config.llm.defaultModel}`);
  console.log(`  API Key: ${config.llm.apiKey ? '✅ Set' : '❌ Missing'}`);
  console.log('');

  if (!config.llm.apiKey) {
    console.error('Set LLM_API_KEY in .env.local');
    process.exit(1);
  }

  console.log('Testing LLM...');
  const { text, model, usage } = await generateText({
    config: config.llm,
    prompt: 'Say "Hello Detective!" in a mysterious tone. Keep it under 20 words.',
    maxTokens: 50,
  });

  console.log('');
  console.log('Response:', text);
  console.log('Model used:', model);
  console.log('Tokens:', usage);
}

main().catch(console.error);
