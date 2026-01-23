import posthog from 'posthog-js';

// Type definitions for analytics events
export interface GameSessionProperties {
  story_id: string;
  story_name: string;
  completed: boolean;
  correct_accusation: boolean;
  score: number;
  rating: string;
  time_elapsed_seconds: number;
  interrogation_order: string[];
  characters_interrogated: number;
  total_turns: number;
  turns: Array<{ character: string; role: 'user' | 'ai'; content: string }>;
  accused_character: string;
  accusation_motive: string;
  accusation_method: string;
}

export interface LeaderboardViewedProperties {
  type: 'story' | 'global';
  story_id?: string;
  story_name?: string;
  user_rank?: number;
}

export interface CreateStageCompletedProperties {
  stage: 'prompt' | 'foundation' | 'characters' | 'clues';
  stage_duration_seconds: number;
  modifications: string[];
}

export interface MysteryPublishedProperties {
  story_id: string;
  characters_count: number;
  clues_count: number;
  total_creation_time_seconds: number;
}

// Analytics wrapper with type safety
export const analytics = {
  // Track a custom event
  track: (event: string, properties?: object) => {
    if (typeof window !== 'undefined') {
      posthog.capture(event, properties);
    }
  },

  // Identify a user (call on sign in)
  identify: (userId: string, traits?: object) => {
    if (typeof window !== 'undefined') {
      posthog.identify(userId, traits);
    }
  },

  // Reset identity (call on sign out)
  reset: () => {
    if (typeof window !== 'undefined') {
      posthog.reset();
    }
  },

  // Typed event helpers
  gameSession: (properties: GameSessionProperties) => {
    posthog.capture('game_session', properties);
  },

  leaderboardViewed: (properties: LeaderboardViewedProperties) => {
    posthog.capture('leaderboard_viewed', properties);
  },

  createMysteryStarted: () => {
    posthog.capture('create_mystery_started');
  },

  createStageCompleted: (properties: CreateStageCompletedProperties) => {
    posthog.capture('create_stage_completed', properties);
  },

  mysteryPublished: (properties: MysteryPublishedProperties) => {
    posthog.capture('mystery_published', properties);
  },
};
