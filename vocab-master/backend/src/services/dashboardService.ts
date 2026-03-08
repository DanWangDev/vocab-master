import { db } from '../config/database';

export interface DashboardUserStats {
  current_streak: number;
  avg_accuracy: number | null;
  days_active_this_week: number;
  sessions_this_week: number;
  total_time_this_week_minutes: number;
  activity_status: 'active' | 'some' | 'inactive';
  quizzes_taken: number;
  total_words_studied: number;
}

export interface WeeklyComparison {
  this_week: {
    days_active: number;
    quizzes: number;
    sessions: number;
    words: number;
    time_minutes: number;
    avg_accuracy: number | null;
  };
  last_week: {
    days_active: number;
    quizzes: number;
    sessions: number;
    words: number;
    time_minutes: number;
    avg_accuracy: number | null;
  };
}

export interface WeakWord {
  word: string;
  incorrect_count: number;
  total_attempts: number;
}

export interface UserDetailStats {
  quizHistory: Array<{
    id: number;
    completed_at: string;
    total_questions: number;
    correct_answers: number;
    accuracy: number;
    score: number;
    total_time_spent: number;
    quiz_type: string;
  }>;
  studyHistory: Array<{
    id: number;
    start_time: string;
    end_time: string | null;
    words_reviewed: number;
  }>;
  weakWords: WeakWord[];
  weeklyComparison: WeeklyComparison;
  summary: {
    days_active_this_week: number;
    total_time_this_week_minutes: number;
    avg_accuracy: number | null;
  };
}

function calculateStreak(userId: number): number {
  const activityDates = db.prepare(`
    SELECT DISTINCT activity_date FROM (
      SELECT date(start_time) as activity_date FROM study_sessions WHERE user_id = ?
      UNION
      SELECT date(completed_at) as activity_date FROM quiz_results WHERE user_id = ?
      UNION
      SELECT date(created_at) as activity_date FROM daily_challenges WHERE user_id = ?
    )
    ORDER BY activity_date DESC
  `).all(userId, userId, userId) as { activity_date: string }[];

  if (activityDates.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mostRecentDate = new Date(activityDates[0].activity_date);
  const diffFromToday = Math.floor(
    (today.getTime() - mostRecentDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffFromToday > 1) return 0;

  let expectedDate = mostRecentDate;
  for (const { activity_date } of activityDates) {
    const currentDate = new Date(activity_date);
    const diff = Math.floor(
      (expectedDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diff <= 1) {
      streak++;
      expectedDate = new Date(currentDate);
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

function getWeeklyStats(userId: number, weekOffset: number) {
  const offsetClause = weekOffset === 0
    ? "date('now', 'weekday 0', '-6 days')"
    : "date('now', 'weekday 0', '-13 days')";
  const endClause = weekOffset === 0
    ? "date('now', '+1 day')"
    : "date('now', 'weekday 0', '-6 days')";

  const daysActive = db.prepare(`
    SELECT COUNT(DISTINCT activity_date) as count FROM (
      SELECT date(start_time) as activity_date FROM study_sessions
        WHERE user_id = ? AND date(start_time) >= ${offsetClause} AND date(start_time) < ${endClause}
      UNION
      SELECT date(completed_at) as activity_date FROM quiz_results
        WHERE user_id = ? AND date(completed_at) >= ${offsetClause} AND date(completed_at) < ${endClause}
      UNION
      SELECT date(created_at) as activity_date FROM daily_challenges
        WHERE user_id = ? AND date(created_at) >= ${offsetClause} AND date(created_at) < ${endClause}
    )
  `).get(userId, userId, userId) as { count: number };

  const quizzes = db.prepare(`
    SELECT COUNT(*) as count FROM quiz_results
    WHERE user_id = ? AND date(completed_at) >= ${offsetClause} AND date(completed_at) < ${endClause}
  `).get(userId) as { count: number };

  const sessions = db.prepare(`
    SELECT COUNT(*) as count FROM study_sessions
    WHERE user_id = ? AND date(start_time) >= ${offsetClause} AND date(start_time) < ${endClause}
  `).get(userId) as { count: number };

  const words = db.prepare(`
    SELECT COALESCE(SUM(words_reviewed), 0) as count FROM study_sessions
    WHERE user_id = ? AND date(start_time) >= ${offsetClause} AND date(start_time) < ${endClause}
  `).get(userId) as { count: number };

  const timeResult = db.prepare(`
    SELECT
      COALESCE(SUM(MIN(total_time_spent, 3600)), 0) as quiz_time
    FROM quiz_results
    WHERE user_id = ? AND date(completed_at) >= ${offsetClause} AND date(completed_at) < ${endClause}
  `).get(userId) as { quiz_time: number };

  const studyTimeResult = db.prepare(`
    SELECT
      COALESCE(SUM(MIN(
        CAST((julianday(end_time) - julianday(start_time)) * 86400 AS INTEGER),
        3600
      )), 0) as study_time
    FROM study_sessions
    WHERE user_id = ? AND end_time IS NOT NULL
      AND date(start_time) >= ${offsetClause} AND date(start_time) < ${endClause}
  `).get(userId) as { study_time: number };

  const accuracy = db.prepare(`
    SELECT ROUND(AVG(correct_answers * 100.0 / NULLIF(total_questions, 0)), 0) as avg
    FROM quiz_results
    WHERE user_id = ? AND total_questions > 0
      AND date(completed_at) >= ${offsetClause} AND date(completed_at) < ${endClause}
  `).get(userId) as { avg: number | null };

  const totalTimeSeconds = (timeResult.quiz_time || 0) + (studyTimeResult.study_time || 0);

  return {
    days_active: daysActive.count,
    quizzes: quizzes.count,
    sessions: sessions.count,
    words: words.count,
    time_minutes: Math.round(totalTimeSeconds / 60),
    avg_accuracy: accuracy.avg,
  };
}

function getActivityStatus(userId: number): 'active' | 'some' | 'inactive' {
  const recent = db.prepare(`
    SELECT MAX(latest) as latest FROM (
      SELECT MAX(start_time) as latest FROM study_sessions WHERE user_id = ?
      UNION ALL
      SELECT MAX(completed_at) as latest FROM quiz_results WHERE user_id = ?
      UNION ALL
      SELECT MAX(created_at) as latest FROM daily_challenges WHERE user_id = ?
    )
  `).get(userId, userId, userId) as { latest: string | null };

  if (!recent.latest) return 'inactive';

  const latestDate = new Date(recent.latest);
  const now = new Date();
  const diffHours = (now.getTime() - latestDate.getTime()) / (1000 * 60 * 60);

  if (diffHours <= 48) return 'active';

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  if (latestDate >= weekStart) return 'some';

  return 'inactive';
}

export function getUserDashboardStats(userId: number): DashboardUserStats {
  const thisWeek = getWeeklyStats(userId, 0);

  const quizzesTaken = db.prepare(
    'SELECT COUNT(*) as count FROM quiz_results WHERE user_id = ?'
  ).get(userId) as { count: number };

  const wordsStudied = db.prepare(
    'SELECT COALESCE(SUM(words_reviewed), 0) as count FROM study_sessions WHERE user_id = ?'
  ).get(userId) as { count: number };

  const overallAccuracy = db.prepare(`
    SELECT ROUND(AVG(correct_answers * 100.0 / NULLIF(total_questions, 0)), 0) as avg
    FROM quiz_results WHERE user_id = ? AND total_questions > 0
  `).get(userId) as { avg: number | null };

  return {
    current_streak: calculateStreak(userId),
    avg_accuracy: overallAccuracy.avg,
    days_active_this_week: thisWeek.days_active,
    sessions_this_week: thisWeek.quizzes + thisWeek.sessions,
    total_time_this_week_minutes: thisWeek.time_minutes,
    activity_status: getActivityStatus(userId),
    quizzes_taken: quizzesTaken.count,
    total_words_studied: wordsStudied.count,
  };
}

export function getUserDetailStats(userId: number): UserDetailStats {
  const quizHistory = db.prepare(`
    SELECT id, completed_at, total_questions, correct_answers,
      ROUND(correct_answers * 100.0 / NULLIF(total_questions, 0), 1) as accuracy,
      score, total_time_spent, quiz_type
    FROM quiz_results WHERE user_id = ? ORDER BY completed_at DESC LIMIT 50
  `).all(userId) as UserDetailStats['quizHistory'];

  const studyHistory = db.prepare(`
    SELECT id, start_time, end_time, words_reviewed
    FROM study_sessions WHERE user_id = ? ORDER BY start_time DESC LIMIT 50
  `).all(userId) as UserDetailStats['studyHistory'];

  const weakWords = db.prepare(`
    SELECT word,
      SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as incorrect_count,
      COUNT(*) as total_attempts
    FROM quiz_answers qa
    JOIN quiz_results qr ON qa.quiz_result_id = qr.id
    WHERE qr.user_id = ?
    GROUP BY word
    HAVING total_attempts >= 3 AND incorrect_count > total_attempts * 0.5
    ORDER BY incorrect_count DESC
    LIMIT 20
  `).all(userId) as WeakWord[];

  const thisWeek = getWeeklyStats(userId, 0);
  const lastWeek = getWeeklyStats(userId, 1);

  return {
    quizHistory,
    studyHistory,
    weakWords,
    weeklyComparison: {
      this_week: thisWeek,
      last_week: lastWeek,
    },
    summary: {
      days_active_this_week: thisWeek.days_active,
      total_time_this_week_minutes: thisWeek.time_minutes,
      avg_accuracy: thisWeek.avg_accuracy,
    },
  };
}

export const dashboardService = {
  getUserDashboardStats,
  getUserDetailStats,
};
