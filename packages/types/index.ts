// Story Types
export interface Story {
  id: string;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedMinutes: number;
  setting: StorySetting;
  premise: string;
  actualEvents: string[];
  solution: Solution;
  redHerrings: string[];
}

export interface StorySetting {
  location: string;
  timePeriod: string;
  atmosphere: string;
}

export interface Solution {
  culprit: string; // character id
  method: string;
  motive: string;
  explanation: string;
}

// Character Types
export interface Character {
  id: string;
  name: string;
  role: string;
  age: number;
  isGuilty: boolean;
  personality: Personality;
  appearance: Appearance;
  knowledge: Knowledge;
  secrets: Secret[];
  behaviorUnderPressure: BehaviorUnderPressure;
  relationships: Record<string, string>;
}

export interface Personality {
  traits: string[];
  speechStyle: string;
  quirks: string[];
}

export interface Appearance {
  description: string;
  imagePrompt: string;
}

export interface Knowledge {
  knowsAboutCrime: string;
  knowsAboutOthers: string[];
  alibi: string;
}

export interface Secret {
  content: string;
  willingnessToReveal: 'low' | 'medium' | 'high' | 'never';
  revealCondition: string;
}

export interface BehaviorUnderPressure {
  defensive: string;
  whenCaughtLying: string;
  whenAccused: string;
}

// Plot Point Types
export interface PlotPoint {
  id: string;
  category: 'motive' | 'alibi' | 'evidence' | 'relationship';
  description: string;
  importance: 'low' | 'medium' | 'high' | 'critical';
  points: number;
  revealedBy: string[]; // character ids
  detectionHints: string[];
}

export interface PlotPointsConfig {
  plotPoints: PlotPoint[];
  minimumPointsToAccuse: number;
  perfectScoreThreshold: number;
}

// Game State Types
export interface GameSession {
  id: string;
  storyId: string;
  startedAt: Date;
  status: 'in_progress' | 'solved' | 'failed' | 'abandoned';
  conversations: Record<string, ConversationMessage[]>;
  unlockedPlotPoints: string[];
  currentScore: number;
  accusation?: Accusation;
}

export interface ConversationMessage {
  role: 'player' | 'character';
  content: string;
  timestamp: Date;
  plotPointsRevealed?: string[];
}

export interface Accusation {
  accusedCharacterId: string;
  reasoning: string;
  submittedAt: Date;
  isCorrect: boolean;
  score: AccusationScore;
}

export interface AccusationScore {
  correctCulprit: boolean;
  reasoningScore: number; // 0-100
  plotPointsScore: number;
  totalScore: number;
}

// Config Types
export interface StoryConfig {
  id: string;
  enabled: boolean;
  description?: string;
  difficulty?: string;
  estimatedTime?: string;
}

export interface StoriesConfig {
  stories: StoryConfig[];
  defaults: {
    maxMessagesPerCharacter: number;
    allowAccusationWithoutEvidence: boolean;
    showHintsAfterMessages: number;
  };
}
