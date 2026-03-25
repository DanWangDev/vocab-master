import type { HubTokenClaims } from '@danwangdev/auth-client/server';
import db from '../config/database.js';
import { userRepository } from '../repositories/userRepository.js';
import type { UserRow } from '../types/index.js';

/**
 * Map a hub role to a local app role.
 * The hub has generic roles; the app distinguishes student/parent/admin.
 * Admin maps directly. For non-admin hub users, preserve existing local role
 * if the user already exists, otherwise default to 'student'.
 */
function mapHubRole(hubRole: string, existingRole?: 'student' | 'parent' | 'admin'): 'student' | 'parent' | 'admin' {
  if (hubRole === 'admin') return 'admin';
  if (existingRole) return existingRole;
  return 'student';
}

/**
 * Sync a hub-authenticated user into the local users table.
 *
 * Match strategy:
 * 1. By hub_user_id (returning user)
 * 2. By email (first-time hub login for existing local/google user)
 * 3. Create new user (brand new)
 *
 * Returns the local users.id for use in req.user.userId.
 */
export function syncHubUser(claims: HubTokenClaims): UserRow {
  const hubUserId = claims.sub;

  // 1. Match by hub_user_id (most common path for returning users)
  const byHubId = db.prepare('SELECT * FROM users WHERE hub_user_id = ?').get(hubUserId) as UserRow | undefined;
  if (byHubId) {
    // Update mutable claims
    db.prepare(`
      UPDATE users SET username = ?, display_name = ?, email = ?, email_verified = 1, role = ?
      WHERE id = ?
    `).run(claims.username, claims.displayName, claims.email, mapHubRole(claims.role, byHubId.role), byHubId.id);
    return userRepository.findById(byHubId.id)!;
  }

  // 2. Match by email (migration path: existing local/google user logging in via hub for the first time)
  if (claims.email) {
    const byEmail = userRepository.findByEmail(claims.email);
    if (byEmail) {
      db.prepare(`
        UPDATE users SET hub_user_id = ?, auth_provider = 'hub', username = ?, display_name = ?, email_verified = 1, role = ?
        WHERE id = ?
      `).run(hubUserId, claims.username, claims.displayName, mapHubRole(claims.role, byEmail.role), byEmail.id);
      return userRepository.findById(byEmail.id)!;
    }
  }

  // 3. Create new user
  const result = db.prepare(`
    INSERT INTO users (username, password_hash, display_name, role, email, email_verified, auth_provider, hub_user_id)
    VALUES (?, NULL, ?, ?, ?, 1, 'hub', ?)
  `).run(claims.username, claims.displayName, mapHubRole(claims.role), claims.email, hubUserId);

  const userId = result.lastInsertRowid as number;

  // Create default settings and stats
  db.prepare(`
    INSERT INTO user_settings (user_id, sound_enabled, auto_advance, language)
    VALUES (?, 1, 0, 'en')
  `).run(userId);

  db.prepare(`
    INSERT INTO user_stats (user_id, total_words_studied, quizzes_taken, challenges_completed, best_challenge_score, last_study_date)
    VALUES (?, 0, 0, 0, 0, NULL)
  `).run(userId);

  return userRepository.findById(userId)!;
}
