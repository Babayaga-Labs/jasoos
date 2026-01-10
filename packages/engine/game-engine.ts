import type { GameSession, Story, Character } from '../types';

export class GameEngine {
  private session: GameSession | null = null;

  async startGame(storyId: string): Promise<GameSession> {
    // TODO: Load story from /stories/{storyId}
    // TODO: Initialize game session
    // TODO: Return session with initial state
    throw new Error('Not implemented');
  }

  async sendMessage(characterId: string, message: string): Promise<{
    response: string;
    plotPointsRevealed: string[];
  }> {
    // TODO: Send message to character agent
    // TODO: Check for plot point revelations
    // TODO: Update session state
    throw new Error('Not implemented');
  }

  async submitAccusation(characterId: string, reasoning: string): Promise<{
    isCorrect: boolean;
    score: number;
    explanation: string;
  }> {
    // TODO: Validate accusation
    // TODO: Score reasoning
    // TODO: Return result with explanation
    throw new Error('Not implemented');
  }

  getSession(): GameSession | null {
    return this.session;
  }
}
