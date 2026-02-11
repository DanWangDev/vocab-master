interface ScoringParams {
  isCorrect: boolean;
  timeRemaining: number;  // seconds
  totalTime: number;      // seconds (25 for daily challenge)
  streak: number;         // consecutive correct answers
}

/**
 * Calculate points for Daily Challenge
 * - Base: 100 points for correct answer
 * - Speed bonus: 0-50 points based on time remaining
 * - Streak multiplier: 1.0 + 0.1 per streak, max 2.0
 */
export function calculatePoints(params: ScoringParams): number {
  const { isCorrect, timeRemaining, totalTime, streak } = params;

  if (!isCorrect) return 0;

  // Base points for correct answer
  const basePoints = 100;

  // Speed bonus (0-50 points based on time remaining)
  const speedBonus = Math.round((timeRemaining / totalTime) * 50);

  // Streak multiplier (1.0 + 0.1 per streak, max 2.0)
  const streakMultiplier = Math.min(1 + (streak * 0.1), 2.0);

  return Math.round((basePoints + speedBonus) * streakMultiplier);
}

/**
 * Calculate final score as percentage
 */
export function calculatePercentage(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}

/**
 * Get grade based on percentage
 */
export function getGrade(percentage: number): { grade: string; color: string } {
  if (percentage >= 90) return { grade: 'A+', color: 'text-green-600' };
  if (percentage >= 80) return { grade: 'A', color: 'text-green-500' };
  if (percentage >= 70) return { grade: 'B', color: 'text-blue-500' };
  if (percentage >= 60) return { grade: 'C', color: 'text-yellow-500' };
  if (percentage >= 50) return { grade: 'D', color: 'text-orange-500' };
  return { grade: 'F', color: 'text-red-500' };
}
