import type { Accusation, AccusationScore, PlotPoint, Solution } from '../types';

export class ScoringSystem {
  /**
   * Score an accusation based on:
   * 1. Correct culprit identification
   * 2. Quality of reasoning
   * 3. Plot points uncovered
   */
  async scoreAccusation(
    accusation: Accusation,
    solution: Solution,
    unlockedPlotPoints: PlotPoint[],
    allPlotPoints: PlotPoint[]
  ): Promise<AccusationScore> {
    const correctCulprit = accusation.accusedCharacterId === solution.culprit;

    // Calculate plot points score (percentage of available points)
    const maxPoints = allPlotPoints.reduce((sum, pp) => sum + pp.points, 0);
    const earnedPoints = unlockedPlotPoints.reduce((sum, pp) => sum + pp.points, 0);
    const plotPointsScore = Math.round((earnedPoints / maxPoints) * 100);

    // Score reasoning using LLM
    const reasoningScore = await this.scoreReasoning(
      accusation.reasoning,
      solution,
      correctCulprit
    );

    // Calculate total score
    // Correct culprit: 50 points base
    // Reasoning: up to 30 points
    // Plot points: up to 20 points
    const totalScore =
      (correctCulprit ? 50 : 0) +
      Math.round(reasoningScore * 0.3) +
      Math.round(plotPointsScore * 0.2);

    return {
      correctCulprit,
      reasoningScore,
      plotPointsScore,
      totalScore
    };
  }

  private async scoreReasoning(
    reasoning: string,
    solution: Solution,
    correctCulprit: boolean
  ): Promise<number> {
    // TODO: Use LLM to evaluate reasoning quality
    // Check if reasoning mentions:
    // - Correct motive
    // - Correct method
    // - Logical deduction chain

    // Placeholder scoring
    if (!correctCulprit) return 0;
    if (reasoning.length < 50) return 20;
    if (reasoning.length < 150) return 50;
    return 70; // TODO: Replace with actual LLM evaluation
  }
}
