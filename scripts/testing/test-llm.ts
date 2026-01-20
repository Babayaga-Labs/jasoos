/**
 * Test LLM connection
 * Usage: npx tsx scripts/testing/test-llm.ts
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { loadAIConfig, LLMClient } from '../../packages/ai';

async function main() {
  const config = loadAIConfig();

  console.log('LLM Configuration:');
  console.log(`  Provider: ${config.llm.provider}`);
  console.log(`  Model: ${config.llm.roleplayModel}`);
  console.log(`  API Key: ${config.llm.apiKey ? '✅ Set' : '❌ Missing'}`);
  console.log('');

  if (!config.llm.apiKey) {
    console.error('Set LLM_API_KEY in .env.local');
    process.exit(1);
  }

  const client = new LLMClient(config.llm);

  console.log('Testing LLM...');
  const response = await client.generate(
    'Say "Hello Detective!" in a mysterious tone. Keep it under 20 words.',
    { maxTokens: 50 }
  );

  console.log('');
  console.log('Response:', response.content);
  console.log('Model used:', response.model);
  console.log('Tokens:', response.usage);
}

main().catch(console.error);
