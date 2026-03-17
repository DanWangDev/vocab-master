import { wordMasteryRepository } from '../repositories/index.js';
import { userRepository } from '../repositories/index.js';
import { db } from '../config/database.js';
import { computedStatsService } from './computedStatsService.js';
import type { StudentReportSummary } from '../types/index.js';

function getRecentAccuracy(userId: number): number {
  const result = db.prepare(`
    SELECT COALESCE(
      ROUND(AVG(correct_answers * 100.0 / NULLIF(total_questions, 0)), 0),
      0
    ) as avg_accuracy
    FROM quiz_results
    WHERE user_id = ?
  `).get(userId) as { avg_accuracy: number };
  return result.avg_accuracy;
}

function getCurrentStreak(userId: number): number {
  const activityDates = db.prepare(`
    SELECT DISTINCT date(start_time) as activity_date FROM study_sessions WHERE user_id = ?
    UNION
    SELECT DISTINCT date(completed_at) as activity_date FROM quiz_results WHERE user_id = ?
    ORDER BY activity_date DESC
  `).all(userId, userId) as Array<{ activity_date: string }>;

  let streak = 0;
  if (activityDates.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const mostRecentDate = new Date(activityDates[0].activity_date);
    const diffFromToday = Math.floor((today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffFromToday <= 1) {
      let expectedDate = mostRecentDate;
      for (const { activity_date } of activityDates) {
        const currentDate = new Date(activity_date);
        const diff = Math.floor((expectedDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diff <= 1) {
          streak++;
          expectedDate = new Date(currentDate);
          expectedDate.setDate(expectedDate.getDate() - 1);
        } else {
          break;
        }
      }
    }
  }
  return streak;
}

function getStudySessionCount(userId: number): number {
  const result = db.prepare(
    'SELECT COUNT(*) as count FROM study_sessions WHERE user_id = ?'
  ).get(userId) as { count: number };
  return result.count;
}

export const reportService = {
  getStudentSummary(userId: number): StudentReportSummary {
    const user = userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const stats = computedStatsService.getComputedStats(userId);
    const breakdown = wordMasteryRepository.getBreakdown(userId);
    const weakWords = wordMasteryRepository.getWeakWords(userId, 10);
    const strongWords = wordMasteryRepository.getStrongWords(userId, 10);
    const trend = wordMasteryRepository.getLearningTrend(userId, 30);

    return {
      userId,
      username: user.username,
      displayName: user.display_name,
      masteryBreakdown: breakdown,
      recentAccuracy: getRecentAccuracy(userId),
      totalQuizzes: stats.quizzesTaken,
      totalStudySessions: getStudySessionCount(userId),
      currentStreak: getCurrentStreak(userId),
      weakWords,
      strongWords,
      learningTrend: trend,
    };
  },

  generateCsvExport(userId: number): string {
    const mastery = wordMasteryRepository.getByUserId(userId);
    const lines = ['Word,Correct,Incorrect,Accuracy,Mastery Level,Last Practiced'];

    for (const row of mastery) {
      const total = row.correct_count + row.incorrect_count;
      const accuracy = total > 0 ? Math.round((row.correct_count / total) * 100) : 0;
      const level = ['New', 'Learning', 'Familiar', 'Mastered'][row.mastery_level];
      const lastPracticed = row.last_correct_at || row.last_incorrect_at || '';
      lines.push(
        `"${row.word}",${row.correct_count},${row.incorrect_count},${accuracy}%,${level},${lastPracticed}`
      );
    }

    return lines.join('\n');
  },
};
