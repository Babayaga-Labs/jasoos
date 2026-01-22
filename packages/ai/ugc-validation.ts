/**
 * UGC Validation - Validates story consistency and solvability
 *
 * Two validation modes:
 * 1. Structural checks (fast, sync) - validates basic data integrity
 * 2. Deep check (LLM-based, async) - semantic analysis for logical flaws
 */

import type {
  UGCGeneratedCharacter,
  UGCGeneratedClue,
  UGCSolution,
} from './types/ugc-types';
import type { LLMConfig } from './config';
import { LLMClient } from './llm-client';
import { LLMValidationSchema, type LLMValidationResponse, type ValidationCategory, type ValidationSeverity } from './schemas/validation-schema';

/**
 * Helper to safely get alibi as a string (LLM might return object)
 */
function getAlibiString(alibi: unknown): string {
  if (typeof alibi === 'string') return alibi;
  if (alibi && typeof alibi === 'object') {
    // Handle cases where LLM returns { claim: "...", isTrue: false }
    if ('claim' in alibi && typeof (alibi as Record<string, unknown>).claim === 'string') {
      return (alibi as Record<string, unknown>).claim as string;
    }
    // Try to stringify for any other object structure
    return JSON.stringify(alibi);
  }
  return '';
}

// ============================================================================
// Types
// ============================================================================

export interface ValidationWarning {
  category: ValidationCategory | 'structural';
  severity: ValidationSeverity;
  message: string;
  suggestion?: string;
  characterId?: string;
  clueId?: string;
}

export interface ValidationResult {
  warnings: ValidationWarning[];
  isPublishable: boolean; // Always true since we never block
}






// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Input for foundation story validation
 */
export interface FoundationValidationInput {
  clues: UGCGeneratedClue[];
  characters: UGCGeneratedCharacter[];
  timeline: string[];
  solution: UGCSolution;
}

/**
 * Structural validation - fast, sync checks for data integrity
 * Only checks things that are objectively wrong (not subjective quality)
 */
export function validateStructure(input: FoundationValidationInput): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const { clues, characters, solution } = input;

  const characterIds = new Set(characters.map((c) => c.id));
  const victimIds = new Set(characters.filter((c) => c.isVictim).map((c) => c.id));
  const culprit = characters.find((c) => c.isGuilty);

  // Check: Culprit must exist
  if (!culprit) {
    warnings.push({
      category: 'structural',
      severity: 'major',
      message: 'No culprit found in characters',
      suggestion: 'Mark one character as guilty',
    });
  }

  // Check: Clue revealers must be valid
  for (const clue of clues) {
    if (!clue.revealedBy || clue.revealedBy.length === 0) {
      continue; // Not a structural error - LLM can catch this
    }

    for (const revealerId of clue.revealedBy) {
      // Clue references non-existent character
      if (!characterIds.has(revealerId)) {
        warnings.push({
          category: 'structural',
          severity: 'major',
          message: `Clue "${clue.description.substring(0, 40)}..." references non-existent character`,
          suggestion: 'Remove this character from revealers or check character IDs',
          clueId: clue.id,
          characterId: revealerId,
        });
      }
      // Clue assigned to victim (dead people can't talk)
      else if (victimIds.has(revealerId)) {
        const victimName = characters.find((c) => c.id === revealerId)?.name || 'Unknown';
        warnings.push({
          category: 'structural',
          severity: 'medium',
          message: `Clue assigned to victim "${victimName}" who cannot be interrogated`,
          suggestion: 'Reassign this clue to a living character',
          clueId: clue.id,
          characterId: revealerId,
        });
      }
    }
  }

  return warnings;
}

/**
 * LLM-based validation - deep semantic analysis for logical flaws
 */
export async function validateWithLLM(
  input: FoundationValidationInput,
  llmConfig: LLMConfig
): Promise<ValidationWarning[]> {
  const { clues, characters, timeline, solution } = input;

  // Find the culprit
  const culprit = characters.find((c) => c.isGuilty);
  if (!culprit) {
    return []; // Can't do deep check without culprit
  }

  // Format data for the LLM
  const clueData = clues.map((c) => ({
    id: c.id,
    description: c.description,
    revealedBy: c.revealedBy
      .map((id) => characters.find((ch) => ch.id === id)?.name || id)
      .join(', '),
  }));

  const characterData = characters
    .filter((c) => !c.isVictim)
    .map((c) => ({
      name: c.name,
      role: c.role,
      isGuilty: c.isGuilty,
      alibi: getAlibiString(c.knowledge?.alibi),
      knowsAboutCrime: c.knowledge?.knowsAboutCrime || '',
      secrets: c.secrets?.map((s) => s.content) || [],
    }));

  const prompt = `You are a mystery story editor checking a user-created murder mystery game for logical flaws.

## CULPRIT
Name: ${culprit.name}
Role: ${culprit.role}
False Alibi: ${getAlibiString(culprit.knowledge?.alibi)}

## SOLUTION
Method: ${solution.method}
Motive: ${solution.motive}

## CLUES (what players can discover)
${clueData.map((c, i) => `${i + 1}. "${c.description}" (revealed by: ${c.revealedBy})`).join('\n')}

## CHARACTERS
${characterData.map((c) => `- ${c.name} (${c.role})${c.isGuilty ? ' [CULPRIT]' : ''}
  Alibi: ${c.alibi || 'None'}
  Knows: ${c.knowsAboutCrime || 'Nothing'}
  Secrets: ${c.secrets.length > 0 ? c.secrets.join('; ') : 'None'}`).join('\n\n')}

## TIMELINE
${timeline.map((e, i) => `${i + 1}. ${e}`).join('\n')}

## YOUR TASK
Analyze this mystery for the following issues. Only report REAL problems - if the mystery is well-constructed, return an empty issues array.

CHECK FOR:
1. **logical_flaw**: Do any clues contradict each other or create impossible scenarios?
2. **secret_mismatch**: Do character secrets contradict or fail to support clues they're supposed to reveal?
3. **alibi_unbreakable**: Is there NO clue that exposes the culprit's false alibi? Players need a way to catch the lie.
4. **evidence_gap**: Can players NOT logically identify the culprit from the available clues?
5. **motive_hidden**: Do clues fail to reveal WHY the culprit did it?
6. **method_hidden**: Do clues fail to reveal HOW the crime was committed?
7. **witness_contradiction**: Does a character's statement/knowledge directly contradict a clue?

SEVERITY GUIDE:
- major: Mystery is broken or unsolvable
- medium: Significant flaw that hurts gameplay
- minor: Small issue, nice to fix but not critical

Be constructive - provide specific, actionable suggestions.`;

  try {
    const llmClient = new LLMClient(llmConfig);
    const response = await llmClient.generateJSON<LLMValidationResponse>(prompt, {
      schema: LLMValidationSchema,
      maxTokens: 2000,
      temperature: 0.3, // Lower temp for more consistent analysis
    });

    // Convert LLM response to ValidationWarning format
    return response.issues.map((issue) => ({
      category: issue.category,
      severity: issue.severity,
      message: issue.message,
      suggestion: issue.suggestion,
    }));
  } catch (error) {
    console.error('LLM validation failed:', error);
    // Return empty array on error - don't block user
    return [];
  }
}

/**
 * Master validation for foundation-based flow
 * @param input - Story data to validate
 * @param options.deepCheck - If true, runs LLM-based semantic validation
 * @param options.llmConfig - Required if deepCheck is true
 */
export async function validateFoundationStory(
  input: FoundationValidationInput,
  options: { deepCheck?: boolean; llmConfig?: LLMConfig } = {}
): Promise<ValidationResult> {
  const warnings: ValidationWarning[] = [];

  // 1. Quick structural checks (sync, no LLM) - always run
  warnings.push(...validateStructure(input));

  // 2. LLM-based semantic validation - only if deepCheck requested and config provided
  if (options.deepCheck && options.llmConfig) {
    const llmWarnings = await validateWithLLM(input, options.llmConfig);
    warnings.push(...llmWarnings);
  }

  // Sort: major → medium → minor
  const severityOrder = { major: 0, medium: 1, minor: 2 };
  warnings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    warnings,
    isPublishable: true, // Never block publishing
  };
}
