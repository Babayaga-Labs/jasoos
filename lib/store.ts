import { create } from 'zustand';

// Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
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
  /** URL to scene image in Supabase Storage */
  sceneImageUrl?: string;
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
  /** Third-person case summary (like detective notes) */
  statement: string;
  /** URL to character portrait image in Supabase Storage */
  imageUrl?: string;
}

export interface GameState {
  // Story data
  storyFolderId: string | null; // The folder name used for API calls
  story: Story | null;
  characters: Character[];

  // Session
  chatHistories: Record<string, ChatMessage[]>;  // characterId -> messages

  // Timer
  timeRemaining: number;  // seconds remaining
  timerStarted: boolean;
  isTimeUp: boolean;

  // UI state
  selectedCharacter: string | null;
  isAccusationOpen: boolean;
  isResultsOpen: boolean;
  isLoading: boolean;
  gameStatus: 'idle' | 'playing' | 'won' | 'lost';

  // Results
  accusationResult: {
    isCorrect: boolean;
    score: number;           // 0-100 weighted score
    reasoningScore: number;  // 0-100 how good the reasoning was
    timeTaken: number;       // seconds taken to solve
  } | null;

  // Actions
  loadStory: (storyId: string) => Promise<void>;
  selectCharacter: (characterId: string | null) => void;
  addChatMessage: (characterId: string, message: ChatMessage) => void;
  updateLastMessage: (characterId: string, content: string) => void;
  startTimer: () => void;
  tickTimer: () => void;
  openAccusation: () => void;
  closeAccusation: () => void;
  submitAccusation: (characterId: string, reasoning: string) => Promise<void>;
  resetGame: () => void;
}

const GAME_DURATION_SECONDS = 10 * 60; // 10 minutes

export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  storyFolderId: null,
  story: null,
  characters: [],
  chatHistories: {},
  timeRemaining: GAME_DURATION_SECONDS,
  timerStarted: false,
  isTimeUp: false,
  selectedCharacter: null,
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
        storyFolderId: storyId,
        story: data.story,
        characters: data.characters,
        chatHistories: {},
        timeRemaining: GAME_DURATION_SECONDS,
        timerStarted: false,
        isTimeUp: false,
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

  updateLastMessage: (characterId: string, content: string) => {
    const { chatHistories } = get();
    const history = chatHistories[characterId] || [];
    if (history.length === 0) return;

    const updatedHistory = [...history];
    const lastIndex = updatedHistory.length - 1;
    updatedHistory[lastIndex] = {
      ...updatedHistory[lastIndex],
      content,
    };

    set({
      chatHistories: {
        ...chatHistories,
        [characterId]: updatedHistory,
      },
    });
  },

  startTimer: () => {
    const { timerStarted } = get();
    if (timerStarted) return;
    set({ timerStarted: true });
  },

  tickTimer: () => {
    const { timeRemaining, gameStatus } = get();
    if (gameStatus !== 'playing') return;

    const newTime = Math.max(0, timeRemaining - 1);
    const isTimeUp = newTime === 0;

    set({
      timeRemaining: newTime,
      isTimeUp,
      // Auto-open accusation when time runs out
      isAccusationOpen: isTimeUp ? true : get().isAccusationOpen,
    });
  },

  openAccusation: () => set({ isAccusationOpen: true }),
  closeAccusation: () => {
    // Can't close if time is up - must make accusation
    const { isTimeUp } = get();
    if (!isTimeUp) {
      set({ isAccusationOpen: false });
    }
  },

  submitAccusation: async (characterId: string, reasoning: string) => {
    set({ isLoading: true });

    // Calculate time taken (600 seconds - remaining time)
    const GAME_DURATION = 10 * 60;
    const timeTaken = GAME_DURATION - get().timeRemaining;

    try {
      const response = await fetch('/api/game/accuse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storyId: get().storyFolderId,
          accusedCharacterId: characterId,
          reasoning,
        }),
      });

      const data = await response.json();

      set({
        accusationResult: {
          isCorrect: data.isCorrect,
          score: data.score,
          reasoningScore: data.reasoningScore,
          timeTaken,
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

  resetGame: () => {
    set({
      storyFolderId: null,
      story: null,
      characters: [],
      chatHistories: {},
      timeRemaining: GAME_DURATION_SECONDS,
      timerStarted: false,
      isTimeUp: false,
      selectedCharacter: null,
      isAccusationOpen: false,
      isResultsOpen: false,
      gameStatus: 'idle',
      accusationResult: null,
    });
  },
}));
