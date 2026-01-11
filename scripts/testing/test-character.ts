/**
 * Test character conversation
 * Usage: npx tsx scripts/testing/test-character.ts <story-id> <character-id>
 *
 * Example: npx tsx scripts/testing/test-character.ts test-mystery kabir_khan
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { loadAIConfig, CharacterAgent } from '../../packages/ai';

const STORIES_DIR = path.join(process.cwd(), 'stories');

async function main() {
  const storyId = process.argv[2];
  const characterId = process.argv[3];

  if (!storyId || !characterId) {
    console.log('Usage: npx tsx scripts/testing/test-character.ts <story-id> <character-id>');
    console.log('');
    console.log('Example: npx tsx scripts/testing/test-character.ts test-mystery kabir_khan');
    process.exit(1);
  }

  // Load character
  const charactersPath = path.join(STORIES_DIR, storyId, 'characters.json');
  if (!fs.existsSync(charactersPath)) {
    console.error(`❌ Characters file not found: ${charactersPath}`);
    process.exit(1);
  }

  const { characters } = JSON.parse(fs.readFileSync(charactersPath, 'utf-8'));
  const character = characters.find((c: any) => c.id === characterId);

  if (!character) {
    console.error(`❌ Character not found: ${characterId}`);
    console.log('Available characters:', characters.map((c: any) => c.id).join(', '));
    process.exit(1);
  }

  // Initialize agent
  const config = loadAIConfig();
  if (!config.llm.apiKey) {
    console.error('❌ LLM_API_KEY not set');
    process.exit(1);
  }

  const agent = new CharacterAgent(character, config.llm);

  console.log('═'.repeat(50));
  console.log(`Interrogating: ${character.name}`);
  console.log(`Role: ${character.role}`);
  console.log(`Guilty: ${character.isGuilty ? '🔴 YES' : '🟢 No'}`);
  console.log('═'.repeat(50));
  console.log('');
  console.log('Type your questions. Type "exit" to quit.');
  console.log('');

  // Interactive chat
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const askQuestion = () => {
    rl.question('You: ', async (input) => {
      if (input.toLowerCase() === 'exit') {
        console.log('');
        console.log('Interrogation ended.');
        rl.close();
        return;
      }

      try {
        const response = await agent.respond(input);
        console.log(`${character.name}: ${response}`);
        console.log('');
      } catch (error) {
        console.error('Error:', error);
      }

      askQuestion();
    });
  };

  askQuestion();
}

main().catch(console.error);
