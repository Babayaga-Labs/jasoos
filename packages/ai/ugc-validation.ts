/**
 * UGC Validation - Validates story consistency and solvability
 *
 * Checks:
 * 1. Clue revealers are valid, living characters
 * 2. Character knowledge aligns with timeline
 * 3. Mystery is solvable from available clues
 * 4. Culprit's alibi has detectable holes
 */

import type {
  UGCGeneratedCharacter,
  UGCGeneratedPlotPoint,
  UGCGeneratedStory,
  UGCGeneratedData,
} from './types/ugc-types';

// ============================================================================
// Types
// ============================================================================

export interface ValidationWarning {
  category: 'clue' | 'knowledge' | 'timeline' | 'solvability' | 'alibi';
  severity: 'info' | 'warning' | 'critical';
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
// Clue Validation
// ============================================================================

/**
 * Validates that clue revealedBy references valid, living characters
 */
export function validateClueRevealers(
  clues: UGCGeneratedPlotPoint[],
  characters: UGCGeneratedCharacter[]
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const characterIds = new Set(characters.map((c) => c.id));
  const victimIds = new Set(characters.filter((c) => c.isVictim).map((c) => c.id));

  for (const clue of clues) {
    // Check for empty revealedBy
    if (!clue.revealedBy || clue.revealedBy.length === 0) {
      warnings.push({
        category: 'clue',
        severity: 'critical',
        message: `Clue "${clue.description.substring(0, 50)}..." has no one to reveal it`,
        suggestion: 'Assign at least one character who can reveal this clue',
        clueId: clue.id,
      });
      continue;
    }

    for (const revealerId of clue.revealedBy) {
      // Check if character exists
      if (!characterIds.has(revealerId)) {
        warnings.push({
          category: 'clue',
          severity: 'critical',
          message: `Clue "${clue.description.substring(0, 50)}..." references non-existent character "${revealerId}"`,
          suggestion: 'Remove this character from revealedBy or add them to the story',
          clueId: clue.id,
          characterId: revealerId,
        });
      }
      // Check if character is a victim
      else if (victimIds.has(revealerId)) {
        warnings.push({
          category: 'clue',
          severity: 'warning',
          message: `Clue "${clue.description.substring(0, 50)}..." is assigned to victim "${revealerId}" who cannot be interrogated`,
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
 * Validates that characters who reveal clues actually have related knowledge
 */
export function validateClueKnowledgeAlignment(
  clues: UGCGeneratedPlotPoint[],
  characters: UGCGeneratedCharacter[]
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const characterMap = new Map(characters.map((c) => [c.id, c]));

  for (const clue of clues) {
    if (!clue.revealedBy) continue;

    for (const revealerId of clue.revealedBy) {
      const character = characterMap.get(revealerId);
      if (!character) continue;

      // Check if character's knowledge relates to the clue
      const clueKeywords = extractKeywords(clue.description);
      const knowledgeText = [
        character.knowledge?.knowsAboutCrime || '',
        ...(character.knowledge?.knowsAboutOthers || []),
        character.knowledge?.alibi || '',
      ].join(' ').toLowerCase();

      const hasRelatedKnowledge = clueKeywords.some((keyword) =>
        knowledgeText.includes(keyword.toLowerCase())
      );

      if (!hasRelatedKnowledge) {
        warnings.push({
          category: 'knowledge',
          severity: 'warning',
          message: `${character.name} is assigned to reveal "${clue.description.substring(0, 40)}..." but may not have related knowledge`,
          suggestion: `Update ${character.name}'s knowledge to include information about this clue`,
          clueId: clue.id,
          characterId: character.id,
        });
      }
    }
  }

  return warnings;
}

// ============================================================================
// Knowledge Coherence
// ============================================================================

/**
 * Validates character knowledge is complete and coherent
 */
export function validateKnowledgeCoherence(
  characters: UGCGeneratedCharacter[],
  timeline: string[]
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  for (const character of characters) {
    if (character.isVictim) continue;

    // Check for empty knowledge fields
    if (!character.knowledge?.knowsAboutCrime || character.knowledge.knowsAboutCrime.trim() === '') {
      warnings.push({
        category: 'knowledge',
        severity: 'warning',
        message: `${character.name} has no information about the crime`,
        suggestion: 'Add what they witnessed or heard about the incident',
        characterId: character.id,
      });
    }

    if (!character.knowledge?.alibi || character.knowledge.alibi.trim() === '') {
      warnings.push({
        category: 'knowledge',
        severity: 'warning',
        message: `${character.name} has no alibi`,
        suggestion: 'Add where they claim to have been during the crime',
        characterId: character.id,
      });
    }

    if (!character.knowledge?.knowsAboutOthers || character.knowledge.knowsAboutOthers.length === 0) {
      warnings.push({
        category: 'knowledge',
        severity: 'info',
        message: `${character.name} knows nothing about other characters`,
        suggestion: 'Consider adding observations about other suspects',
        characterId: character.id,
      });
    }

    // Check if alibi contradicts timeline (for non-guilty)
    if (!character.isGuilty && character.knowledge?.alibi && timeline.length > 0) {
      const alibiMentionsOthers = characters.some(
        (other) =>
          other.id !== character.id &&
          character.knowledge.alibi.toLowerCase().includes(other.name.toLowerCase())
      );

      if (!alibiMentionsOthers) {
        warnings.push({
          category: 'alibi',
          severity: 'info',
          message: `${character.name}'s alibi doesn't mention any witnesses`,
          suggestion: 'Consider adding another character who can verify their alibi',
          characterId: character.id,
        });
      }
    }
  }

  return warnings;
}

// ============================================================================
// Solvability
// ============================================================================

/**
 * Validates the mystery is solvable from available clues
 */
export function validateSolvability(
  plotPoints: {
    plotPoints: UGCGeneratedPlotPoint[];
    minimumPointsToAccuse: number;
    perfectScoreThreshold: number;
  },
  solution: { culprit: string; method: string; motive: string },
  characters: UGCGeneratedCharacter[]
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const clues = plotPoints.plotPoints;

  // Count clues by category
  const categoryCounts = {
    motive: 0,
    alibi: 0,
    evidence: 0,
    relationship: 0,
  };

  let totalPoints = 0;
  let culpritPoints = 0;
  const culpritCharacter = characters.find((c) => c.isGuilty);
  const culpritName = culpritCharacter?.name.toLowerCase() || solution.culprit.toLowerCase();

  for (const clue of clues) {
    categoryCounts[clue.category]++;
    totalPoints += clue.points;

    // Check if clue points to culprit
    const clueText = clue.description.toLowerCase();
    if (clueText.includes(culpritName) || clueText.includes('guilty') || clueText.includes('culprit')) {
      culpritPoints += clue.points;
    }
  }

  // Check for missing categories
  if (categoryCounts.motive === 0) {
    warnings.push({
      category: 'solvability',
      severity: 'critical',
      message: 'No motive clues found',
      suggestion: 'Add at least one clue revealing why the culprit committed the crime',
    });
  }

  if (categoryCounts.alibi === 0) {
    warnings.push({
      category: 'solvability',
      severity: 'warning',
      message: 'No alibi-related clues found',
      suggestion: 'Add clues that expose holes in the culprit\'s alibi',
    });
  }

  if (categoryCounts.evidence === 0) {
    warnings.push({
      category: 'solvability',
      severity: 'critical',
      message: 'No physical evidence clues found',
      suggestion: 'Add clues about physical evidence connecting to the crime',
    });
  }

  // Check total points vs thresholds
  if (totalPoints < plotPoints.perfectScoreThreshold) {
    warnings.push({
      category: 'solvability',
      severity: 'warning',
      message: `Total available points (${totalPoints}) is less than perfect score threshold (${plotPoints.perfectScoreThreshold})`,
      suggestion: 'Add more clues or increase point values',
    });
  }

  if (totalPoints < plotPoints.minimumPointsToAccuse) {
    warnings.push({
      category: 'solvability',
      severity: 'critical',
      message: `Total available points (${totalPoints}) is less than minimum to accuse (${plotPoints.minimumPointsToAccuse})`,
      suggestion: 'Add more clues - players cannot currently win the game',
    });
  }

  // Check if culprit can be identified
  if (culpritPoints === 0) {
    warnings.push({
      category: 'solvability',
      severity: 'critical',
      message: 'No clues directly point to the culprit',
      suggestion: 'Ensure some clues mention or implicate the guilty character',
    });
  }

  return warnings;
}

// ============================================================================
// Culprit Alibi Validation
// ============================================================================

/**
 * Validates culprit's alibi has detectable holes
 */
export function validateCulpritAlibi(
  characters: UGCGeneratedCharacter[],
  timeline: string[]
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const culprit = characters.find((c) => c.isGuilty);

  if (!culprit) {
    warnings.push({
      category: 'alibi',
      severity: 'critical',
      message: 'No culprit found in characters',
      suggestion: 'Mark one character as guilty',
    });
    return warnings;
  }

  const alibi = culprit.knowledge?.alibi || '';

  if (!alibi || alibi.trim() === '') {
    warnings.push({
      category: 'alibi',
      severity: 'warning',
      message: `Culprit ${culprit.name} has no alibi`,
      suggestion: 'Add a false alibi that can be broken through interrogation',
      characterId: culprit.id,
    });
    return warnings;
  }

  // Check if alibi is too vague
  if (alibi.length < 30) {
    warnings.push({
      category: 'alibi',
      severity: 'info',
      message: `Culprit ${culprit.name}'s alibi is very short`,
      suggestion: 'Consider adding more detail to make breaking it more satisfying',
      characterId: culprit.id,
    });
  }

  // Check if another character can contradict the alibi
  const alibiMentionsLocation = extractLocations(alibi);
  const otherCharactersAtLocations = characters.filter((c) => {
    if (c.id === culprit.id || c.isVictim) return false;
    const theirAlibi = c.knowledge?.alibi || '';
    return alibiMentionsLocation.some((loc) => theirAlibi.toLowerCase().includes(loc.toLowerCase()));
  });

  if (otherCharactersAtLocations.length === 0 && alibiMentionsLocation.length > 0) {
    warnings.push({
      category: 'alibi',
      severity: 'warning',
      message: `No other character can verify or contradict ${culprit.name}'s alibi`,
      suggestion: 'Consider placing another character in the same location to witness (or not witness) the culprit',
      characterId: culprit.id,
    });
  }

  // Check if alibi sounds too solid (contains certainty words)
  const certaintyWords = ['definitely', 'absolutely', 'certainly', 'always', 'never left', 'the whole time', 'entire time'];
  const hasCertaintyWords = certaintyWords.some((word) => alibi.toLowerCase().includes(word));

  if (hasCertaintyWords) {
    warnings.push({
      category: 'alibi',
      severity: 'info',
      message: `${culprit.name}'s false alibi uses very certain language which might seem suspicious`,
      suggestion: 'This could be intentional (overconfident liar) or you may want to soften the language',
      characterId: culprit.id,
    });
  }

  return warnings;
}

// ============================================================================
// Master Validation Function
// ============================================================================

/**
 * Runs all validation checks and returns combined results
 */
export function validateStoryConsistency(data: UGCGeneratedData): ValidationResult {
  const warnings: ValidationWarning[] = [];

  // Clue validation
  warnings.push(...validateClueRevealers(data.plotPoints.plotPoints, data.characters));
  warnings.push(...validateClueKnowledgeAlignment(data.plotPoints.plotPoints, data.characters));

  // Knowledge coherence
  warnings.push(...validateKnowledgeCoherence(data.characters, data.story.actualEvents));

  // Solvability
  warnings.push(...validateSolvability(data.plotPoints, data.story.solution, data.characters));

  // Culprit alibi
  warnings.push(...validateCulpritAlibi(data.characters, data.story.actualEvents));

  // Sort by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  warnings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    warnings,
    isPublishable: true, // Never block publishing
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extracts key words from a clue description for matching
 */
function extractKeywords(text: string): string[] {
  // Remove common words and extract meaningful terms
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'that', 'this', 'these',
    'those', 'it', 'its', 'they', 'them', 'their', 'he', 'she', 'him',
    'her', 'his', 'hers', 'who', 'whom', 'which', 'what', 'when', 'where',
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));
}

/**
 * Extracts location-like words from text
 */
function extractLocations(text: string): string[] {
  // Common location indicators
  const locationPatterns = [
    /in the (\w+)/gi,
    /at the (\w+)/gi,
    /near the (\w+)/gi,
    /by the (\w+)/gi,
    /inside the (\w+)/gi,
    /outside the (\w+)/gi,
  ];

  const locations: string[] = [];
  for (const pattern of locationPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      locations.push(match[1]);
    }
  }

  // Also look for common room/place names
  const commonPlaces = ['garden', 'library', 'kitchen', 'bedroom', 'office', 'study', 'hall', 'parlor', 'ballroom', 'dining', 'living', 'basement', 'attic', 'garage'];
  for (const place of commonPlaces) {
    if (text.toLowerCase().includes(place)) {
      locations.push(place);
    }
  }

  return [...new Set(locations)];
}
