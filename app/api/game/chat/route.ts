import { NextRequest, NextResponse } from 'next/server';

// Load env
import 'dotenv/config';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { loadAIConfig, LLMClient } from '@/packages/ai';
import {
  getCharactersByStoryId,
  getCluesByStoryId,
  characterRowToGameFormat,
  clueRowToGameFormat,
} from '@/lib/supabase/queries';

export async function POST(request: NextRequest) {
  try {
    const { storyId, characterId, message, history } = await request.json();

    // Load character data from Supabase
    const characterRows = await getCharactersByStoryId(storyId);
    const characters = characterRows.map(characterRowToGameFormat);

    const character = characters.find((c) => c.id === characterId);
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 });
    }

    // Load clues from Supabase
    const clueRows = await getCluesByStoryId(storyId);
    const plotPoints = clueRows.map(clueRowToGameFormat);

    // Build system prompt
    const systemPrompt = buildCharacterPrompt(character);

    // Initialize LLM
    const config = loadAIConfig();
    const llm = new LLMClient(config.llm);

    // Build message history - filter out messages with null/empty content
    const messages = history
      .filter((msg: any) => msg.content != null && msg.content !== '')
      .map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));

    messages.push({ role: 'user', content: message });

    // Get response
    const response = await llm.chat(systemPrompt, messages, {
      maxTokens: 300,
      temperature: 0.8,
    });

    // Check for plot points revealed
    const plotPointsRevealed = checkForPlotPoints(
      response.content,
      characterId,
      plotPoints
    );

    return NextResponse.json({
      response: response.content,
      plotPointsRevealed,
    });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 });
  }
}

function buildCharacterPrompt(character: any): string {
  const { personality, knowledge, secrets, behaviorUnderPressure, relationships } = character;

  return `You are ${character.name}, ${character.role}. You are being interrogated by a detective investigating a crime.

## YOUR IDENTITY
- Name: ${character.name}
- Role: ${character.role}
- Age: ${character.age}
- Personality: ${personality.traits.join(', ')}
- Speech style: ${personality.speechStyle}
- Quirks: ${personality.quirks?.join('; ') || 'None'}

## WHAT YOU KNOW
- About the crime: ${knowledge.knowsAboutCrime}
- Your alibi: ${knowledge.alibi}
- About others:
${knowledge.knowsAboutOthers?.map((k: string) => `  - ${k}`).join('\n') || '  - Nothing specific'}

## YOUR SECRETS (Never reveal these directly, only if truly cornered)
${secrets?.map((s: any) => `- ${s.content} [Will reveal: ${s.willingnessToReveal}] [Condition: ${s.revealCondition}]`).join('\n') || '- None'}

## HOW YOU BEHAVE
- When defensive: ${behaviorUnderPressure?.defensive || 'Get evasive'}
- When caught in a lie: ${behaviorUnderPressure?.whenCaughtLying || 'Deflect'}
- When directly accused: ${behaviorUnderPressure?.whenAccused || 'Deny firmly'}

## YOUR RELATIONSHIPS
${Object.entries(relationships || {}).map(([id, rel]) => `- ${id}: ${rel}`).join('\n') || '- No specific relationships defined'}

## ROLEPLAY RULES
1. Stay in character at ALL times. Never break character or acknowledge you're an AI.
2. Speak naturally in first person as ${character.name}.
3. Be cooperative but protective of your secrets.
4. If asked something you don't know, say you don't know - don't make things up.
5. Show appropriate emotions - nervousness when pressed on lies, indignation when falsely accused.
6. Keep responses concise (2-4 sentences typically).
7. ${character.isGuilty
    ? 'You ARE guilty. Be subtle in your deception. Deflect, redirect, but never outright confess unless given absolutely undeniable proof.'
    : 'You are innocent. Cooperate with the investigation while protecting your minor secrets.'}

Respond only as ${character.name}. Begin.`;
}

function checkForPlotPoints(
  response: string,
  characterId: string,
  plotPoints: any[]
): string[] {
  const revealed: string[] = [];
  const responseLower = response.toLowerCase();

  for (const pp of plotPoints) {
    // Check if this character can reveal this plot point
    if (!pp.revealedBy?.includes(characterId)) continue;

    // Check for detection hints
    const hasHint = pp.detectionHints?.some((hint: string) =>
      responseLower.includes(hint.toLowerCase())
    );

    if (hasHint) {
      revealed.push(pp.id);
    }
  }

  return revealed;
}
