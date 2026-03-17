import type { Database } from 'better-sqlite3';
import type { IGroupRepository } from '../interfaces/IGroupRepository.js';
import type { GroupRow, GroupMemberRow, GroupWithMemberCount, GroupMemberWithUser, GroupWordlistRow } from '../../types/index.js';

export class SqliteGroupRepository implements IGroupRepository {
  constructor(private readonly db: Database) {}

  create(name: string, description: string, createdBy: number, joinCode: string, maxMembers: number): GroupRow {
    const result = this.db.prepare(`
      INSERT INTO groups (name, description, created_by, join_code, max_members)
      VALUES (?, ?, ?, ?, ?)
    `).run(name, description, createdBy, joinCode, maxMembers);

    return this.findById(result.lastInsertRowid as number)!;
  }

  findById(id: number): GroupRow | undefined {
    return this.db.prepare('SELECT * FROM groups WHERE id = ?').get(id) as GroupRow | undefined;
  }

  findByJoinCode(joinCode: string): GroupRow | undefined {
    return this.db.prepare('SELECT * FROM groups WHERE join_code = ?').get(joinCode) as GroupRow | undefined;
  }

  findByUserId(userId: number): GroupWithMemberCount[] {
    return this.db.prepare(`
      SELECT g.*, COUNT(gm2.id) as member_count
      FROM groups g
      JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
      LEFT JOIN group_members gm2 ON gm2.group_id = g.id
      GROUP BY g.id
      ORDER BY g.name ASC
    `).all(userId) as GroupWithMemberCount[];
  }

  findByCreatedBy(createdBy: number): GroupWithMemberCount[] {
    return this.db.prepare(`
      SELECT g.*, COUNT(gm.id) as member_count
      FROM groups g
      LEFT JOIN group_members gm ON gm.group_id = g.id
      WHERE g.created_by = ?
      GROUP BY g.id
      ORDER BY g.name ASC
    `).all(createdBy) as GroupWithMemberCount[];
  }

  update(id: number, data: { name?: string; description?: string }): GroupRow | undefined {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push('description = ?');
      values.push(data.description);
    }

    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    this.db.prepare(`UPDATE groups SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  }

  remove(id: number): void {
    this.db.prepare('DELETE FROM groups WHERE id = ?').run(id);
  }

  // Members

  addMember(groupId: number, userId: number, role: 'owner' | 'admin' | 'member'): GroupMemberRow {
    const result = this.db.prepare(`
      INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)
    `).run(groupId, userId, role);

    return this.db.prepare('SELECT * FROM group_members WHERE id = ?').get(result.lastInsertRowid as number) as GroupMemberRow;
  }

  removeMember(groupId: number, userId: number): void {
    this.db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(groupId, userId);
  }

  findMembers(groupId: number): GroupMemberWithUser[] {
    return this.db.prepare(`
      SELECT gm.*, u.username, u.display_name
      FROM group_members gm
      JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id = ?
      ORDER BY
        CASE gm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
        u.username ASC
    `).all(groupId) as GroupMemberWithUser[];
  }

  findMember(groupId: number, userId: number): GroupMemberRow | undefined {
    return this.db.prepare(
      'SELECT * FROM group_members WHERE group_id = ? AND user_id = ?'
    ).get(groupId, userId) as GroupMemberRow | undefined;
  }

  updateMemberRole(groupId: number, userId: number, role: 'owner' | 'admin' | 'member'): void {
    this.db.prepare(
      'UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?'
    ).run(role, groupId, userId);
  }

  getMemberCount(groupId: number): number {
    const row = this.db.prepare(
      'SELECT COUNT(*) as count FROM group_members WHERE group_id = ?'
    ).get(groupId) as { count: number };
    return row.count;
  }

  // Wordlists

  assignWordlist(groupId: number, wordlistId: number): GroupWordlistRow {
    const result = this.db.prepare(`
      INSERT INTO group_wordlists (group_id, wordlist_id) VALUES (?, ?)
    `).run(groupId, wordlistId);

    return this.db.prepare('SELECT * FROM group_wordlists WHERE id = ?').get(result.lastInsertRowid as number) as GroupWordlistRow;
  }

  unassignWordlist(groupId: number, wordlistId: number): void {
    this.db.prepare('DELETE FROM group_wordlists WHERE group_id = ? AND wordlist_id = ?').run(groupId, wordlistId);
  }

  findWordlists(groupId: number): GroupWordlistRow[] {
    return this.db.prepare(
      'SELECT * FROM group_wordlists WHERE group_id = ? ORDER BY assigned_at DESC'
    ).all(groupId) as GroupWordlistRow[];
  }

  findGroupWordlistIds(userId: number): number[] {
    const rows = this.db.prepare(`
      SELECT DISTINCT gw.wordlist_id
      FROM group_wordlists gw
      JOIN group_members gm ON gm.group_id = gw.group_id
      WHERE gm.user_id = ?
    `).all(userId) as { wordlist_id: number }[];
    return rows.map(r => r.wordlist_id);
  }
}
