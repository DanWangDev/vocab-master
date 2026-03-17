import type { Database } from 'better-sqlite3';
import type { PvpChallengeRow, PvpChallengeWithUsers, PvpAnswerRow, PvpStatus } from '../../types/index.js';
import type { IPvpRepository, CreatePvpChallengeParams, SubmitPvpAnswerParams } from '../interfaces/index.js';

export class SqlitePvpRepository implements IPvpRepository {
  constructor(private readonly db: Database) {}

  create(params: CreatePvpChallengeParams): PvpChallengeRow {
    const result = this.db.prepare(`
      INSERT INTO pvp_challenges (challenger_id, opponent_id, wordlist_id, question_count, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(params.challengerId, params.opponentId, params.wordlistId, params.questionCount, params.expiresAt);

    return this.db.prepare('SELECT * FROM pvp_challenges WHERE id = ?').get(result.lastInsertRowid) as PvpChallengeRow;
  }

  findById(id: number): PvpChallengeWithUsers | undefined {
    return this.db.prepare(`
      SELECT pc.*,
        u1.username as challenger_username, u1.display_name as challenger_display_name,
        u2.username as opponent_username, u2.display_name as opponent_display_name,
        w.name as wordlist_name
      FROM pvp_challenges pc
      JOIN users u1 ON pc.challenger_id = u1.id
      JOIN users u2 ON pc.opponent_id = u2.id
      JOIN wordlists w ON pc.wordlist_id = w.id
      WHERE pc.id = ?
    `).get(id) as PvpChallengeWithUsers | undefined;
  }

  findPending(userId: number): PvpChallengeWithUsers[] {
    return this.db.prepare(`
      SELECT pc.*,
        u1.username as challenger_username, u1.display_name as challenger_display_name,
        u2.username as opponent_username, u2.display_name as opponent_display_name,
        w.name as wordlist_name
      FROM pvp_challenges pc
      JOIN users u1 ON pc.challenger_id = u1.id
      JOIN users u2 ON pc.opponent_id = u2.id
      JOIN wordlists w ON pc.wordlist_id = w.id
      WHERE pc.status = 'pending' AND pc.opponent_id = ?
      ORDER BY pc.created_at DESC
    `).all(userId) as PvpChallengeWithUsers[];
  }

  findActive(userId: number): PvpChallengeWithUsers[] {
    return this.db.prepare(`
      SELECT pc.*,
        u1.username as challenger_username, u1.display_name as challenger_display_name,
        u2.username as opponent_username, u2.display_name as opponent_display_name,
        w.name as wordlist_name
      FROM pvp_challenges pc
      JOIN users u1 ON pc.challenger_id = u1.id
      JOIN users u2 ON pc.opponent_id = u2.id
      JOIN wordlists w ON pc.wordlist_id = w.id
      WHERE pc.status = 'active' AND (pc.challenger_id = ? OR pc.opponent_id = ?)
      ORDER BY pc.created_at DESC
    `).all(userId, userId) as PvpChallengeWithUsers[];
  }

  findHistory(userId: number, limit: number): PvpChallengeWithUsers[] {
    return this.db.prepare(`
      SELECT pc.*,
        u1.username as challenger_username, u1.display_name as challenger_display_name,
        u2.username as opponent_username, u2.display_name as opponent_display_name,
        w.name as wordlist_name
      FROM pvp_challenges pc
      JOIN users u1 ON pc.challenger_id = u1.id
      JOIN users u2 ON pc.opponent_id = u2.id
      JOIN wordlists w ON pc.wordlist_id = w.id
      WHERE (pc.challenger_id = ? OR pc.opponent_id = ?)
      ORDER BY pc.created_at DESC
      LIMIT ?
    `).all(userId, userId, limit) as PvpChallengeWithUsers[];
  }

  updateStatus(id: number, status: PvpStatus): void {
    this.db.prepare('UPDATE pvp_challenges SET status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(status, id);
  }

  updateScore(id: number, field: 'challenger_score' | 'opponent_score', score: number): void {
    this.db.prepare(`UPDATE pvp_challenges SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`).run(score, id);
  }

  setWinner(id: number, winnerId: number | null): void {
    this.db.prepare('UPDATE pvp_challenges SET winner_id = ?, status = \'completed\', updated_at = datetime(\'now\') WHERE id = ?').run(winnerId, id);
  }

  submitAnswer(params: SubmitPvpAnswerParams): PvpAnswerRow {
    const result = this.db.prepare(`
      INSERT INTO pvp_answers (challenge_id, user_id, question_index, word, correct_answer, selected_answer, is_correct, time_spent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      params.challengeId, params.userId, params.questionIndex,
      params.word, params.correctAnswer, params.selectedAnswer,
      params.isCorrect ? 1 : 0, params.timeSpent
    );

    return this.db.prepare('SELECT * FROM pvp_answers WHERE id = ?').get(result.lastInsertRowid) as PvpAnswerRow;
  }

  getAnswers(challengeId: number, userId: number): PvpAnswerRow[] {
    return this.db.prepare(
      'SELECT * FROM pvp_answers WHERE challenge_id = ? AND user_id = ? ORDER BY question_index'
    ).all(challengeId, userId) as PvpAnswerRow[];
  }

  getAnswerCount(challengeId: number, userId: number): number {
    const row = this.db.prepare(
      'SELECT COUNT(*) as count FROM pvp_answers WHERE challenge_id = ? AND user_id = ?'
    ).get(challengeId, userId) as { count: number };
    return row.count;
  }

  searchOpponents(userId: number, query: string): Array<{ id: number; username: string; displayName: string | null }> {
    const escapedQuery = query.replace(/[%_\\]/g, '\\$&');
    return this.db.prepare(`
      SELECT id, username, display_name as displayName
      FROM users
      WHERE id != ? AND role = 'student'
        AND (username LIKE ? ESCAPE '\\' OR display_name LIKE ? ESCAPE '\\')
      ORDER BY username
      LIMIT 20
    `).all(userId, `%${escapedQuery}%`, `%${escapedQuery}%`) as Array<{ id: number; username: string; displayName: string | null }>;
  }

  findExpired(): PvpChallengeRow[] {
    return this.db.prepare(`
      SELECT * FROM pvp_challenges
      WHERE status IN ('pending', 'active')
        AND expires_at <= datetime('now')
    `).all() as PvpChallengeRow[];
  }
}
