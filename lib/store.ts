import { create } from 'zustand';

// Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  revealedEvidence?: string[];  // Plot point IDs revealed by this message
}

export interface Story {
  id: string;
  title: string;
  difficulty: string;
  estimatedMinutes: number;
  setting: {
    location: string;
    timePeriod: string;
    atmosphere: string;
  };
  premise: string;
  solution: {
    culprit: string;
    method: string;
    motive: string;
    explanation: string;
  };
}

export interface Character {
  id: string;
  name: string;
  role: string;
  age: number;
  isGuilty: boolean;
  appearance: {
    description: string;
    imagePrompt: string;
  };
  personality: {
    traits: string[];
    speechStyle: string;
  };
}

export interface PlotPoint {
  id: string;
  category: string;
  description: string;
  importance: string;
  points: number;
  revealedBy?: string[];
  detectionHints?: string[];
}

export interface GameState {
  // Story data
  storyFolderId: string | null; // The folder name used for API calls
  story: Story | null;
  characters: Character[];
  plotPoints: PlotPoint[];
  totalPossiblePoints: number;
  minimumPointsToAccuse: number;

  // Session
  unlockedPlotPoints: string[];
  currentScore: number;
  newEvidenceCount: number;
  chatHistories: Record<string, ChatMessage[]>;  // characterId -> messages

  // UI state
  selectedCharacter: string | null;
  isNotepadOpen: boolean;
  isAccusationOpen: boolean;
  isResultsOpen: boolean;
  isLoading: boolean;
  gameStatus: 'idle' | 'playing' | 'won' | 'lost';

  // Results
  accusationResult: {
    isCorrect: boolean;
    score: number;
    explanation: string;
  } | null;

  // Actions
  loadStory: (storyId: string) => Promise<void>;
  selectCharacter: (characterId: string | null) => void;
  unlockPlotPoint: (plotPointId: string) => void;
  addChatMessage: (characterId: string, message: ChatMessage) => void;
  updateLastMessage: (characterId: string, content: string, revealedEvidence?: string[]) => void;
  toggleNotepad: () => void;
  openAccusation: () => void;
  closeAccusation: () => void;
  submitAccusation: (characterId: string, reasoning: string) => Promise<void>;
  clearNewEvidenceCount: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  storyFolderId: null,
  story: null,
  characters: [],
  plotPoints: [],
  totalPossiblePoints: 0,
  minimumPointsToAccuse: 0,
  unlockedPlotPoints: [],
  currentScore: 0,
  newEvidenceCount: 0,
  chatHistories: {},
  selectedCharacter: null,
  isNotepadOpen: false,
  isAccusationOpen: false,
  isResultsOpen: false,
  isLoading: false,
  gameStatus: 'idle',
  accusationResult: null,

  // Actions
  loadStory: async (storyId: string) => {
    set({ isLoading: true });

    try {
      const response = await fetch(`/api/game/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId }),
      });

      const data = await response.json();

      set({
        storyFolderId: storyId, // Store the folder name for API calls
        story: data.story,
        characters: data.characters,
        plotPoints: data.plotPoints,
        totalPossiblePoints: data.totalPossiblePoints,
        minimumPointsToAccuse: data.minimumPointsToAccuse,
        unlockedPlotPoints: [],
        currentScore: 0,
        gameStatus: 'playing',
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load story:', error);
      set({ isLoading: false });
    }
  },

  selectCharacter: (characterId: string | null) => {
    set({ selectedCharacter: characterId });
  },

  unlockPlotPoint: (plotPointId: string) => {
    const { unlockedPlotPoints, plotPoints, currentScore, newEvidenceCount } = get();

    if (unlockedPlotPoints.includes(plotPointId)) return;

    const plotPoint = plotPoints.find(pp => pp.id === plotPointId);
    if (!plotPoint) return;

    set({
      unlockedPlotPoints: [...unlockedPlotPoints, plotPointId],
      currentScore: currentScore + plotPoint.points,
      newEvidenceCount: newEvidenceCount + 1,
    });
  },

  addChatMessage: (characterId: string, message: ChatMessage) => {
    const { chatHistories } = get();
    const history = chatHistories[characterId] || [];
    set({
      chatHistories: {
        ...chatHistories,
        [characterId]: [...history, message],
      },
    });
  },

  updateLastMessage: (characterId: string, content: string, revealedEvidence?: string[]) => {
    const { chatHistories } = get();
    const history = chatHistories[characterId] || [];
    if (history.length === 0) return;

    const updatedHistory = [...history];
    const lastIndex = updatedHistory.length - 1;
    updatedHistory[lastIndex] = {
      ...updatedHistory[lastIndex],
      content,
      ...(revealedEvidence && { revealedEvidence }),
    };

    set({
      chatHistories: {
        ...chatHistories,
        [characterId]: updatedHistory,
      },
    });
  },

  toggleNotepad: () => {
    const { isNotepadOpen } = get();
    set({
      isNotepadOpen: !isNotepadOpen,
      newEvidenceCount: isNotepadOpen ? get().newEvidenceCount : 0,
    });
  },

  openAccusation: () => set({ isAccusationOpen: true }),
  closeAccusation: () => set({ isAccusationOpen: false }),

  submitAccusation: async (characterId: string, reasoning: string) => {
    set({ isLoading: true });

    try {
      const response = await fetch('/api/game/accuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: get().storyFolderId, // Use folder name, not story.id
          accusedCharacterId: characterId,
          reasoning,
          unlockedPlotPoints: get().unlockedPlotPoints,
        }),
      });

      const data = await response.json();

      set({
        accusationResult: {
          isCorrect: data.isCorrect,
          score: data.score,
          explanation: data.explanation,
        },
        gameStatus: data.isCorrect ? 'won' : 'lost',
        isAccusationOpen: false,
        isResultsOpen: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to submit accusation:', error);
      set({ isLoading: false });
    }
  },

  clearNewEvidenceCount: () => set({ newEvidenceCount: 0 }),

  resetGame: () => {
    set({
      storyFolderId: null,
      story: null,
      characters: [],
      plotPoints: [],
      unlockedPlotPoints: [],
      currentScore: 0,
      newEvidenceCount: 0,
      chatHistories: {},
      selectedCharacter: null,
      isNotepadOpen: false,
      isAccusationOpen: false,
      isResultsOpen: false,
      gameStatus: 'idle',
      accusationResult: null,
    });
  },
}));
