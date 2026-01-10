import type { PlotPoint, ConversationMessage } from '../types';

export class PlotTracker {
  private plotPoints: PlotPoint[] = [];
  private unlockedIds: Set<string> = new Set();

  constructor(plotPoints: PlotPoint[]) {
    this.plotPoints = plotPoints;
  }

  /**
   * Check if a conversation message revealed any plot points
   * Uses a combination of keyword matching and LLM-as-judge
   */
  async checkForRevelations(
    characterId: string,
    message: ConversationMessage
  ): Promise<string[]> {
    const revealed: string[] = [];

    for (const plotPoint of this.plotPoints) {
      // Skip already unlocked
      if (this.unlockedIds.has(plotPoint.id)) continue;

      // Check if this character can reveal this plot point
      if (!plotPoint.revealedBy.includes(characterId)) continue;

      // Quick keyword check first (cheap)
      const hasKeyword = plotPoint.detectionHints.some(hint =>
        message.content.toLowerCase().includes(hint.toLowerCase())
      );

      if (hasKeyword) {
        // TODO: Use LLM-as-judge for confirmation (more expensive, more accurate)
        // For now, just use keyword match
        revealed.push(plotPoint.id);
        this.unlockedIds.add(plotPoint.id);
      }
    }

    return revealed;
  }

  getUnlockedPlotPoints(): PlotPoint[] {
    return this.plotPoints.filter(pp => this.unlockedIds.has(pp.id));
  }

  getCurrentScore(): number {
    return this.getUnlockedPlotPoints().reduce((sum, pp) => sum + pp.points, 0);
  }

  canAccuse(minimumPoints: number): boolean {
    return this.getCurrentScore() >= minimumPoints;
  }
}
