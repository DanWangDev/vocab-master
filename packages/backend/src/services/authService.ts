import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories/userRepository.js';
import type { User, UserRow } from '../types/index.js';

const PASSWORD_HASH_ROUNDS = 12;

function userRowToUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    email: row.email,
    emailVerified: row.email_verified === 1,
    authProvider: row.auth_provider || 'local',
    createdAt: row.created_at
  };
}

export const authService = {
  /**
   * Create a student account as a parent (auto-linked, no tokens returned)
   */
  async createStudentForParent(
    parentId: number,
    username: string,
    password: string,
    displayName?: string
  ): Promise<{ user: User }> {
    const parentRow = userRepository.findById(parentId);
    if (!parentRow || parentRow.role !== 'parent') {
      throw new Error('Only parents can create student accounts');
    }

    const existing = userRepository.findByUsername(username);
    if (existing) {
      throw new Error('Username already taken');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
    const userRow = userRepository.createStudentForParent(username, passwordHash, parentId, displayName);
    const user = userRowToUser(userRow);

    return { user };
  },

  updateProfile(userId: number, updates: { username?: string; displayName?: string }): User {
    const userRow = userRepository.findById(userId);
    if (!userRow) {
      throw new Error('User not found');
    }

    if (updates.username !== undefined) {
      const existing = userRepository.findByUsername(updates.username);
      if (existing && existing.id !== userId) {
        throw new Error('Username already taken');
      }
      userRepository.updateUsername(userId, updates.username);
    }

    if (updates.displayName !== undefined) {
      userRepository.updateDisplayName(userId, updates.displayName);
    }

    const updatedRow = userRepository.findById(userId)!;
    return userRowToUser(updatedRow);
  },

  /**
   * Reset a user's password directly (for admin/parent use)
   */
  async resetUserPassword(
    requesterId: number,
    requesterRole: 'student' | 'parent' | 'admin',
    targetUserId: number,
    newPassword: string
  ): Promise<void> {
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const targetUser = userRepository.findById(targetUserId);
    if (!targetUser) {
      throw new Error('User not found');
    }

    if (requesterRole === 'admin') {
      if (requesterId === targetUserId) {
        throw new Error('Use password reset via email to change your own password');
      }
    } else if (requesterRole === 'parent') {
      if (!targetUser.parent_id || targetUser.parent_id !== requesterId) {
        throw new Error('You can only reset passwords for your linked students');
      }
    } else {
      throw new Error('Unauthorized to reset passwords');
    }

    const passwordHash = await bcrypt.hash(newPassword, PASSWORD_HASH_ROUNDS);
    userRepository.updatePassword(targetUserId, passwordHash);
  }
};
