import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Support both useChat format (messages array) and legacy format (message + history)
    const { storyId, characterId, messages: useChatMessages, message, history } = body;

    const storyDir = path.join(process.cwd(), 'stories', storyId);

    // Load character data
    const charactersPath = path.join(storyDir, 'characters.json');
    const { characters } = JSON.parse(fs.readFileSync(charactersPath, 'utf-8'));

    const character = characters.find((c: any) => c.id === characterId);
    if (!character) {
      return new Response(JSON.stringify({ error: 'Character not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Build system prompt
    const systemPrompt = buildCharacterPrompt(character);

    // Build message history - use useChat format if available, otherwise legacy format
    let messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;

    if (useChatMessages && Array.isArray(useChatMessages)) {
      // useChat sends messages array directly
      messages = useChatMessages.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: typeof msg.content === 'string' ? msg.content : msg.content?.text || '',
      }));
    } else {
      // Legacy format: message + history
      messages = (history || []).map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }));
      if (message) {
        messages.push({ role: 'user', content: message });
      }
    }

    // Proxy to Python backend
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';
    console.log(`[Chat] Sending ${messages.length} messages to Python backend for ${characterId}`);

    let response: Response;
    try {
      response = await fetch(`${pythonBackendUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          story_id: storyId,
          character_id: characterId,
          messages: messages,
          system_prompt: systemPrompt,
        }),
      });
    } catch (fetchError) {
      console.error('[Chat] Failed to connect to Python backend:', fetchError);
      return new Response(JSON.stringify({ error: 'Backend service unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Chat] Python backend error (${response.status}):`, error);
      return new Response(JSON.stringify({ error }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Stream the response directly
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[Chat] Unhandled error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: `Failed to get response: ${errorMessage}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
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
