import type { JSONSchema } from '../llm-client';

/**
 * Case file data - structured victim/crime info shown to player at game start
 */
export interface CaseFileResponse {
  victimName: string;
  victimDescription: string;
  causeOfDeath: string;
  lastSeen: string;
  locationFound: string;
  discoveredBy: string;
  timeOfDiscovery: string;
  timeOfDeath: string;
  initialEvidence: string[];
}

/**
 * JSON Schema for case file generation
 */
export const CaseFileSchema: JSONSchema = {
  name: 'case_file',
  schema: {
    type: 'object',
    properties: {
      victimName: {
        type: 'string',
        description: 'Victim name and brief identifier (e.g., "Jason Miller, 17")'
      },
      victimDescription: {
        type: 'string',
        description: 'Brief description of who the victim was (e.g., "Junior at Riverside High, star quarterback")'
      },
      causeOfDeath: {
        type: 'string',
        description: 'Observable cause of death - NOT forensic conclusions (e.g., "Multiple stab wounds to the chest")'
      },
      lastSeen: {
        type: 'string',
        description: 'When/where victim was last seen alive (e.g., "7:00 AM, leaving home for football practice")'
      },
      locationFound: {
        type: 'string',
        description: 'Where the body was discovered (e.g., "Basketball locker room, Riverside High gym")'
      },
      discoveredBy: {
        type: 'string',
        description: 'Who discovered the body and their relationship (e.g., "Chuck Reynolds, classmate")'
      },
      timeOfDiscovery: {
        type: 'string',
        description: 'When the body was found (e.g., "6:00 PM")'
      },
      timeOfDeath: {
        type: 'string',
        description: 'Estimated time of death range (e.g., "Between 2:00 PM - 5:00 PM")'
      },
      initialEvidence: {
        type: 'array',
        items: { type: 'string' },
        description: '2-3 initial evidence items - scene observations and victim state'
      },
    },
    required: [
      'victimName',
      'victimDescription',
      'causeOfDeath',
      'lastSeen',
      'locationFound',
      'discoveredBy',
      'timeOfDiscovery',
      'timeOfDeath',
      'initialEvidence'
    ],
    additionalProperties: false,
  },
  strict: true,
};
