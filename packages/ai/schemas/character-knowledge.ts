import type { JSONSchema } from '../llm-client';

/**
 * Type definition for a single character's knowledge
 */
export interface CharacterKnowledgeEntry {
  characterId: string;
  knowsAboutCrime: string;
  knowsAboutOthers: string[];
  alibi: string;
}

/**
 * Response type for character knowledge generation
 */
export interface CharacterKnowledgeResponse {
  characters: CharacterKnowledgeEntry[];
}

/**
 * JSON Schema for character knowledge response
 * Uses array structure because OpenAI structured outputs don't support dynamic keys
 */
export const CharacterKnowledgeSchema: JSONSchema = {
  name: 'character_knowledge',
  schema: {
    type: 'object',
    properties: {
      characters: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            characterId: { type: 'string' },
            knowsAboutCrime: { type: 'string' },
            knowsAboutOthers: {
              type: 'array',
              items: { type: 'string' },
            },
            alibi: { type: 'string' },
          },
          required: ['characterId', 'knowsAboutCrime', 'knowsAboutOthers', 'alibi'],
          additionalProperties: false,
        },
      },
    },
    required: ['characters'],
    additionalProperties: false,
  },
  strict: true,
};
