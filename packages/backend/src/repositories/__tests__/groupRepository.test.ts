import { describe, it, expect, beforeEach } from 'vitest';
import { getTestDb } from '../../test/setup';
import { SqliteGroupRepository } from '../sqlite/SqliteGroupRepository';
import type { Database } from 'better-sqlite3';

describe('SqliteGroupRepository', () => {
  let db: Database;
  let repo: SqliteGroupRepository;
  let userId: number;
  let userId2: number;

  beforeEach(() => {
    db = getTestDb();
    repo = new SqliteGroupRepository(db);

    // Create test users
    db.prepare(`INSERT INTO users (username, password_hash, role) VALUES ('teacher1', 'hash', 'parent')`).run();
    userId = (db.prepare(`SELECT id FROM users WHERE username = 'teacher1'`).get() as { id: number }).id;

    db.prepare(`INSERT INTO users (username, password_hash, role) VALUES ('student1', 'hash', 'student')`).run();
    userId2 = (db.prepare(`SELECT id FROM users WHERE username = 'student1'`).get() as { id: number }).id;
  });

  describe('create and findById', () => {
    it('creates a group and retrieves it', () => {
      const group = repo.create('Test Class', 'A test group', userId, 'ABC123', 30);
      expect(group.name).toBe('Test Class');
      expect(group.description).toBe('A test group');
      expect(group.created_by).toBe(userId);
      expect(group.join_code).toBe('ABC123');
      expect(group.max_members).toBe(30);

      const found = repo.findById(group.id);
      expect(found).toBeDefined();
      expect(found!.name).toBe('Test Class');
    });

    it('returns undefined for non-existent group', () => {
      expect(repo.findById(999)).toBeUndefined();
    });
  });

  describe('findByJoinCode', () => {
    it('finds group by join code', () => {
      repo.create('Group', '', userId, 'XYZ789', 50);
      const found = repo.findByJoinCode('XYZ789');
      expect(found).toBeDefined();
      expect(found!.name).toBe('Group');
    });

    it('returns undefined for invalid code', () => {
      expect(repo.findByJoinCode('NOPE00')).toBeUndefined();
    });
  });

  describe('members', () => {
    let groupId: number;

    beforeEach(() => {
      const group = repo.create('Group', '', userId, 'ABC123', 50);
      groupId = group.id;
      repo.addMember(groupId, userId, 'owner');
    });

    it('adds and finds members', () => {
      repo.addMember(groupId, userId2, 'member');
      const members = repo.findMembers(groupId);
      expect(members).toHaveLength(2);
      expect(members[0].role).toBe('owner');
      expect(members[1].role).toBe('member');
      expect(members[1].username).toBe('student1');
    });

    it('finds a specific member', () => {
      const member = repo.findMember(groupId, userId);
      expect(member).toBeDefined();
      expect(member!.role).toBe('owner');
    });

    it('returns undefined for non-member', () => {
      expect(repo.findMember(groupId, userId2)).toBeUndefined();
    });

    it('removes a member', () => {
      repo.addMember(groupId, userId2, 'member');
      expect(repo.findMembers(groupId)).toHaveLength(2);
      repo.removeMember(groupId, userId2);
      expect(repo.findMembers(groupId)).toHaveLength(1);
    });

    it('updates member role', () => {
      repo.addMember(groupId, userId2, 'member');
      repo.updateMemberRole(groupId, userId2, 'admin');
      const member = repo.findMember(groupId, userId2);
      expect(member!.role).toBe('admin');
    });

    it('counts members', () => {
      expect(repo.getMemberCount(groupId)).toBe(1);
      repo.addMember(groupId, userId2, 'member');
      expect(repo.getMemberCount(groupId)).toBe(2);
    });
  });

  describe('findByUserId', () => {
    it('returns groups the user belongs to with member count', () => {
      const g1 = repo.create('Class A', '', userId, 'AAA111', 50);
      const g2 = repo.create('Class B', '', userId, 'BBB222', 50);
      repo.addMember(g1.id, userId, 'owner');
      repo.addMember(g2.id, userId, 'owner');
      repo.addMember(g1.id, userId2, 'member');

      const groups = repo.findByUserId(userId);
      expect(groups).toHaveLength(2);
      const classA = groups.find(g => g.name === 'Class A');
      expect(classA!.member_count).toBe(2);
    });
  });

  describe('update', () => {
    it('updates group name and description', () => {
      const group = repo.create('Old Name', 'Old desc', userId, 'UPD123', 50);
      const updated = repo.update(group.id, { name: 'New Name', description: 'New desc' });
      expect(updated!.name).toBe('New Name');
      expect(updated!.description).toBe('New desc');
    });
  });

  describe('remove', () => {
    it('deletes a group and cascades to members', () => {
      const group = repo.create('ToDelete', '', userId, 'DEL123', 50);
      repo.addMember(group.id, userId, 'owner');
      repo.remove(group.id);
      expect(repo.findById(group.id)).toBeUndefined();
      expect(repo.findMembers(group.id)).toHaveLength(0);
    });
  });

  describe('wordlists', () => {
    let groupId: number;
    let wordlistId: number;

    beforeEach(() => {
      const group = repo.create('Group', '', userId, 'WLS123', 50);
      groupId = group.id;
      repo.addMember(groupId, userId, 'owner');

      db.prepare(`INSERT INTO wordlists (name, description, is_system, created_by, visibility, word_count) VALUES ('WL1', '', 0, ?, 'shared', 10)`).run(userId);
      wordlistId = (db.prepare(`SELECT id FROM wordlists WHERE name = 'WL1'`).get() as { id: number }).id;
    });

    it('assigns and finds wordlists', () => {
      repo.assignWordlist(groupId, wordlistId);
      const wls = repo.findWordlists(groupId);
      expect(wls).toHaveLength(1);
      expect(wls[0].wordlist_id).toBe(wordlistId);
    });

    it('unassigns a wordlist', () => {
      repo.assignWordlist(groupId, wordlistId);
      repo.unassignWordlist(groupId, wordlistId);
      expect(repo.findWordlists(groupId)).toHaveLength(0);
    });

    it('finds group wordlist IDs for a user', () => {
      repo.assignWordlist(groupId, wordlistId);
      const ids = repo.findGroupWordlistIds(userId);
      expect(ids).toContain(wordlistId);
    });

    it('throws on duplicate assignment', () => {
      repo.assignWordlist(groupId, wordlistId);
      expect(() => repo.assignWordlist(groupId, wordlistId)).toThrow();
    });
  });
});
