import { achievementRepository, notificationRepository, challengeRepository, statsRepository } from '../repositories/index.js';
import type { UserAchievementWithDetails } from '../repositories/interfaces/IAchievementRepository.js';
import type { AchievementRow } from '../types/index.js';
import { logger } from './logger.js';

export interface NewlyEarnedAchievement {
  slug: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}

/**
 * Checks all achievement conditions for a user and awards any newly earned ones.
 * Returns the list of newly earned achievements (for toast notifications).
 */
export function checkAndAwardAchievements(
  userId: number,
  context: {
    quizScore?: number;
    quizTimeSeconds?: number;
    totalQuizzes?: number;
    totalWordsStudied?: number;
    streakDays?: number;
    challengeScore?: number;
  }
): NewlyEarnedAchievement[] {
  const earnedSlugs = new Set(achievementRepository.findEarnedSlugs(userId));
  const allAchievements = achievementRepository.findAll();
  const newlyEarned: NewlyEarnedAchievement[] = [];

  // Gather stats if not provided
  const stats = statsRepository.get(userId);
  const totalQuizzes = context.totalQuizzes ?? stats?.quizzes_taken ?? 0;
  const totalWords = context.totalWordsStudied ?? stats?.total_words_studied ?? 0;
  const streakDays = context.streakDays ?? computeCurrentStreak(userId);

  for (const achievement of allAchievements) {
    if (earnedSlugs.has(achievement.slug)) continue;

    const earned = evaluateAchievement(achievement, {
      ...context,
      totalQuizzes,
      totalWordsStudied: totalWords,
      streakDays,
    });

    if (earned) {
      const row = achievementRepository.award(userId, achievement.id);
      if (row) {
        newlyEarned.push({
          slug: achievement.slug,
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          earnedAt: row.earned_at,
        });

        // Create a notification for the achievement
        notificationRepository.create(
          userId,
          'achievement',
          'Achievement Unlocked!',
          `You earned "${achievement.name}" - ${achievement.description}`,
          { slug: achievement.slug, icon: achievement.icon }
        );

        logger.info(`Achievement awarded: ${achievement.slug} to user ${userId}`);
      }
    }
  }

  return newlyEarned;
}

function evaluateAchievement(
  achievement: AchievementRow,
  context: {
    quizScore?: number;
    quizTimeSeconds?: number;
    totalQuizzes: number;
    totalWordsStudied: number;
    streakDays: number;
    challengeScore?: number;
  }
): boolean {
  switch (achievement.slug) {
    // Quiz achievements
    case 'first_quiz':
      return context.totalQuizzes >= 1;
    case 'quizzes_10':
      return context.totalQuizzes >= 10;
    case 'quizzes_50':
      return context.totalQuizzes >= 50;
    case 'perfect_quiz':
      return context.quizScore === 100;
    case 'speed_demon':
      return context.quizTimeSeconds !== undefined && context.quizTimeSeconds <= 30;

    // Streak achievements
    case 'streak_3':
      return context.streakDays >= 3;
    case 'streak_7':
      return context.streakDays >= 7;
    case 'streak_14':
      return context.streakDays >= 14;
    case 'streak_30':
      return context.streakDays >= 30;

    // Words achievements
    case 'words_10':
      return context.totalWordsStudied >= 10;
    case 'words_50':
      return context.totalWordsStudied >= 50;
    case 'words_100':
      return context.totalWordsStudied >= 100;
    case 'words_500':
      return context.totalWordsStudied >= 500;

    // Challenge achievements
    case 'first_challenge':
      return context.challengeScore !== undefined;
    case 'challenge_score_90':
      return context.challengeScore !== undefined && context.challengeScore >= 90;

    default:
      return false;
  }
}

function computeCurrentStreak(userId: number): number {
  return challengeRepository.calculateStreak(userId);
}

/**
 * Get all achievements with user's earned status.
 */
export function getAchievementsForUser(userId: number): {
  achievements: Array<AchievementRow & { earned: boolean; earnedAt: string | null }>;
  totalEarned: number;
  totalAvailable: number;
} {
  const all = achievementRepository.findAll();
  const earned = achievementRepository.findByUserId(userId);
  const earnedMap = new Map<number, UserAchievementWithDetails>();
  for (const e of earned) {
    earnedMap.set(e.achievement_id, e);
  }

  const achievements = all.map(a => ({
    ...a,
    earned: earnedMap.has(a.id),
    earnedAt: earnedMap.get(a.id)?.earned_at ?? null,
  }));

  return {
    achievements,
    totalEarned: earned.length,
    totalAvailable: all.length,
  };
}
