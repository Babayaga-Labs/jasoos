import type { JSONSchema } from '../llm-client';

/**
 * Validation issue categories for LLM-based mystery validation
 */
export type ValidationCategory =
  | 'logical_flaw'
  | 'secret_mismatch'
  | 'alibi_unbreakable'
  | 'evidence_gap'
  | 'motive_hidden'
  | 'method_hidden'
  | 'witness_contradiction';

/**
 * Severity levels for validation issues
 */
export type ValidationSeverity = 'major' | 'medium' | 'minor';

/**
 * Single validation issue from LLM analysis
 */
export interface LLMValidationIssue {
  category: ValidationCategory;
  severity: ValidationSeverity;
  message: string;
  suggestion: string;
  involvedClueIds?: string[];
  involvedCharacterIds?: string[];
}

/**
 * Response type for LLM validation
 */
export interface LLMValidationResponse {
  issues: LLMValidationIssue[];
}

/**
 * JSON Schema for LLM validation response
 */
export const LLMValidationSchema: JSONSchema = {
  name: 'mystery_validation',
  schema: {
    type: 'object',
    properties: {
      issues: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: [
                'logical_flaw',
                'secret_mismatch',
                'alibi_unbreakable',
                'evidence_gap',
                'motive_hidden',
                'method_hidden',
                'witness_contradiction',
              ],
            },
            severity: {
              type: 'string',
              enum: ['major', 'medium', 'minor'],
            },
            message: { type: 'string' },
            suggestion: { type: 'string' },
            involvedClueIds: {
              type: 'array',
              items: { type: 'string' },
            },
            involvedCharacterIds: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['category', 'severity', 'message', 'suggestion'],
          additionalProperties: false,
        },
      },
    },
    required: ['issues'],
    additionalProperties: false,
  },
  strict: true,
};
