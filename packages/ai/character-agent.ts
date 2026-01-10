import { LLMClient, ChatMessage } from './llm-client';
import type { LLMConfig } from './config';
import type { Character, ConversationMessage } from '../types';

export class CharacterAgent {
  private client: LLMClient;
  private character: Character;
  private conversationHistory: ConversationMessage[] = [];

  constructor(character: Character, llmConfig: LLMConfig) {
    this.client = new LLMClient(llmConfig);
    this.character = character;
  }

  /**
   * Build the system prompt for this character
   * Optimized for roleplay and maintaining character consistency
   */
  private buildSystemPrompt(): string {
    const { personality, knowledge, secrets, behaviorUnderPressure, relationships } = this.character;

    return `You are ${this.character.name}, ${this.character.role}. You are being interrogated by a detective investigating a crime.

## YOUR IDENTITY
- Name: ${this.character.name}
- Role: ${this.character.role}
- Age: ${this.character.age}
- Personality: ${personality.traits.join(', ')}
- Speech style: ${personality.speechStyle}
- Quirks: ${personality.quirks.join('; ')}

## WHAT YOU KNOW
- About the crime: ${knowledge.knowsAboutCrime}
- Your alibi: ${knowledge.alibi}
- About others:
${knowledge.knowsAboutOthers.map(k => `  - ${k}`).join('\n')}

## YOUR SECRETS (Never reveal these directly, only if truly cornered)
${secrets.map(s => `- ${s.content} [Will reveal: ${s.willingnessToReveal}] [Condition: ${s.revealCondition}]`).join('\n')}

## HOW YOU BEHAVE
- When defensive: ${behaviorUnderPressure.defensive}
- When caught in a lie: ${behaviorUnderPressure.whenCaughtLying}
- When directly accused: ${behaviorUnderPressure.whenAccused}

## YOUR RELATIONSHIPS
${Object.entries(relationships).map(([id, rel]) => `- ${id}: ${rel}`).join('\n')}

## ROLEPLAY RULES
1. Stay in character at ALL times. Never break character or acknowledge you're an AI.
2. Speak naturally in first person as ${this.character.name}.
3. Be cooperative but protective of your secrets.
4. If asked something you don't know, say you don't know - don't make things up.
5. Show appropriate emotions - nervousness when pressed on lies, indignation when falsely accused.
6. Keep responses concise (2-4 sentences typically).
7. ${this.character.isGuilty
      ? 'You ARE guilty. Be subtle in your deception. Deflect, redirect, but never outright confess unless given absolutely undeniable proof.'
      : 'You are innocent. Cooperate with the investigation while protecting your minor secrets.'}

Respond only as ${this.character.name}. Begin.`;
  }

  /**
   * Generate a response to the player's message
   */
  async respond(playerMessage: string): Promise<string> {
    this.conversationHistory.push({
      role: 'player',
      content: playerMessage,
      timestamp: new Date()
    });

    const messages: ChatMessage[] = this.conversationHistory.map(msg => ({
      role: msg.role === 'player' ? 'user' : 'assistant',
      content: msg.content
    }));

    const response = await this.client.roleplay(
      this.buildSystemPrompt(),
      messages,
      { maxTokens: 300, temperature: 0.8 }
    );

    this.conversationHistory.push({
      role: 'character',
      content: response.content,
      timestamp: new Date()
    });

    return response.content;
  }

  getConversationHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Reset conversation history (for starting a new interrogation)
   */
  resetConversation(): void {
    this.conversationHistory = [];
  }
}
