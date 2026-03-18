import { describe, it, expect } from 'vitest'
import { getTestDb, createTestStudent } from '../../test/helpers'
import {
  createGroup,
  getGroupDetail,
  getGroupsForUser,
  joinGroup,
  removeMember,
  updateMemberRole,
  deleteGroup,
  updateGroup,
  assignWordlist,
  unassignWordlist,
  canAccessGroup,
} from '../groupService'

function seedWordlist(): number {
  const db = getTestDb()
  const result = db.prepare(`
    INSERT INTO wordlists (name, description, is_system, visibility, word_count)
    VALUES ('Group Test List', 'Test', 0, 'public', 5)
  `).run()
  return result.lastInsertRowid as number
}

describe('groupService', () => {
  describe('createGroup', () => {
    it('creates a group with the creator as owner', async () => {
      const user = await createTestStudent()

      const group = createGroup('Test Group', 'A test group', user.id)

      expect(group.name).toBe('Test Group')
      expect(group.description).toBe('A test group')
      expect(group.createdBy).toBe(user.id)
      expect(group.joinCode).toBeTruthy()
      expect(group.joinCode.length).toBe(6)
      expect(group.memberCount).toBe(1)
      expect(group.members[0].role).toBe('owner')
      expect(group.members[0].userId).toBe(user.id)
    })

    it('generates a unique 6-character join code', async () => {
      const user = await createTestStudent()

      const group1 = createGroup('Group 1', '', user.id)
      const group2 = createGroup('Group 2', '', user.id)

      expect(group1.joinCode).toHaveLength(6)
      expect(group2.joinCode).toHaveLength(6)
      expect(group1.joinCode).not.toBe(group2.joinCode)
    })
  })

  describe('joinGroup', () => {
    it('adds a user to a group via join code', async () => {
      const owner = await createTestStudent()
      const member = await createTestStudent()

      const group = createGroup('Join Test', '', owner.id)
      const joined = joinGroup(group.joinCode, member.id)

      expect(joined.memberCount).toBe(2)
      const memberEntry = joined.members.find(m => m.userId === member.id)
      expect(memberEntry).toBeDefined()
      expect(memberEntry!.role).toBe('member')
    })

    it('throws for invalid join code', async () => {
      const user = await createTestStudent()

      expect(() => joinGroup('INVALID', user.id)).toThrow('Invalid join code')
    })

    it('throws if user is already a member', async () => {
      const owner = await createTestStudent()
      const group = createGroup('Double Join', '', owner.id)

      expect(() => joinGroup(group.joinCode, owner.id)).toThrow('Already a member')
    })

    it('throws if group is full', async () => {
      const owner = await createTestStudent()
      const group = createGroup('Full Group', '', owner.id, 1)

      const user = await createTestStudent()
      expect(() => joinGroup(group.joinCode, user.id)).toThrow('Group is full')
    })
  })

  describe('getGroupDetail', () => {
    it('returns full group details including members', async () => {
      const owner = await createTestStudent()
      const group = createGroup('Detail Test', 'desc', owner.id)

      const detail = getGroupDetail(group.id)

      expect(detail).toBeDefined()
      expect(detail!.name).toBe('Detail Test')
      expect(detail!.description).toBe('desc')
      expect(detail!.members).toHaveLength(1)
    })

    it('returns undefined for non-existent group', () => {
      const detail = getGroupDetail(99999)
      expect(detail).toBeUndefined()
    })
  })

  describe('getGroupsForUser', () => {
    it('returns all groups a user belongs to', async () => {
      const user = await createTestStudent()
      const other = await createTestStudent()

      createGroup('Group A', '', user.id)
      createGroup('Group B', '', user.id)
      createGroup('Group C', '', other.id)

      const groups = getGroupsForUser(user.id)

      expect(groups.length).toBe(2)
    })
  })

  describe('updateGroup', () => {
    it('allows owner to update group name', async () => {
      const owner = await createTestStudent()
      const group = createGroup('Old Name', 'Old Desc', owner.id)

      const updated = updateGroup(group.id, owner.id, { name: 'New Name' })

      expect(updated.name).toBe('New Name')
    })

    it('throws if user is not admin or owner', async () => {
      const owner = await createTestStudent()
      const member = await createTestStudent()
      const group = createGroup('Update Test', '', owner.id)
      joinGroup(group.joinCode, member.id)

      expect(() => updateGroup(group.id, member.id, { name: 'Hacked' }))
        .toThrow('You must be a group owner or admin')
    })
  })

  describe('deleteGroup', () => {
    it('allows owner to delete the group', async () => {
      const owner = await createTestStudent()
      const group = createGroup('Delete Me', '', owner.id)

      deleteGroup(group.id, owner.id)

      const detail = getGroupDetail(group.id)
      expect(detail).toBeUndefined()
    })

    it('throws if non-owner tries to delete', async () => {
      const owner = await createTestStudent()
      const member = await createTestStudent()
      const group = createGroup('Protected', '', owner.id)
      joinGroup(group.joinCode, member.id)

      expect(() => deleteGroup(group.id, member.id))
        .toThrow('Only the group owner can delete a group')
    })
  })

  describe('removeMember', () => {
    it('allows a member to leave the group', async () => {
      const owner = await createTestStudent()
      const member = await createTestStudent()
      const group = createGroup('Leave Test', '', owner.id)
      joinGroup(group.joinCode, member.id)

      removeMember(group.id, member.id, member.id)

      const detail = getGroupDetail(group.id)
      expect(detail!.memberCount).toBe(1)
    })

    it('prevents owner from leaving', async () => {
      const owner = await createTestStudent()
      const group = createGroup('Owner Stay', '', owner.id)

      expect(() => removeMember(group.id, owner.id, owner.id))
        .toThrow('Owner cannot leave')
    })

    it('allows admin to remove a member', async () => {
      const owner = await createTestStudent()
      const admin = await createTestStudent()
      const member = await createTestStudent()
      const group = createGroup('Kick Test', '', owner.id)
      joinGroup(group.joinCode, admin.id)
      joinGroup(group.joinCode, member.id)
      updateMemberRole(group.id, owner.id, admin.id, 'admin')

      removeMember(group.id, admin.id, member.id)

      const detail = getGroupDetail(group.id)
      expect(detail!.memberCount).toBe(2)
    })

    it('prevents removing the owner', async () => {
      const owner = await createTestStudent()
      const admin = await createTestStudent()
      const group = createGroup('Owner Protected', '', owner.id)
      joinGroup(group.joinCode, admin.id)
      updateMemberRole(group.id, owner.id, admin.id, 'admin')

      expect(() => removeMember(group.id, admin.id, owner.id))
        .toThrow('Cannot remove the group owner')
    })
  })

  describe('updateMemberRole', () => {
    it('allows owner to promote a member to admin', async () => {
      const db = getTestDb()
      const owner = await createTestStudent()
      const member = await createTestStudent()
      const group = createGroup('Role Test', '', owner.id)
      joinGroup(group.joinCode, member.id)

      updateMemberRole(group.id, owner.id, member.id, 'admin')

      const row = db.prepare(
        'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?'
      ).get(group.id, member.id) as { role: string }

      expect(row.role).toBe('admin')
    })

    it('allows owner to demote an admin to member', async () => {
      const db = getTestDb()
      const owner = await createTestStudent()
      const admin = await createTestStudent()
      const group = createGroup('Demote Test', '', owner.id)
      joinGroup(group.joinCode, admin.id)
      updateMemberRole(group.id, owner.id, admin.id, 'admin')

      updateMemberRole(group.id, owner.id, admin.id, 'member')

      const row = db.prepare(
        'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?'
      ).get(group.id, admin.id) as { role: string }

      expect(row.role).toBe('member')
    })

    it('throws if non-owner tries to change roles', async () => {
      const owner = await createTestStudent()
      const admin = await createTestStudent()
      const member = await createTestStudent()
      const group = createGroup('No Permission', '', owner.id)
      joinGroup(group.joinCode, admin.id)
      joinGroup(group.joinCode, member.id)
      updateMemberRole(group.id, owner.id, admin.id, 'admin')

      expect(() => updateMemberRole(group.id, admin.id, member.id, 'admin'))
        .toThrow('Only the owner can change member roles')
    })

    it('throws if trying to change owner role', async () => {
      const owner = await createTestStudent()
      const group = createGroup('Owner Role', '', owner.id)

      expect(() => updateMemberRole(group.id, owner.id, owner.id, 'member'))
        .toThrow('Cannot change the owner role')
    })
  })

  describe('assignWordlist', () => {
    it('assigns a wordlist to a group', async () => {
      const owner = await createTestStudent()
      const group = createGroup('WL Test', '', owner.id)
      const wordlistId = seedWordlist()

      assignWordlist(group.id, owner.id, wordlistId)

      const detail = getGroupDetail(group.id)
      expect(detail!.wordlists).toHaveLength(1)
      expect(detail!.wordlists[0].wordlistId).toBe(wordlistId)
    })

    it('throws for non-existent wordlist', async () => {
      const owner = await createTestStudent()
      const group = createGroup('WL Not Found', '', owner.id)

      expect(() => assignWordlist(group.id, owner.id, 99999))
        .toThrow('Wordlist not found')
    })

    it('throws if not admin or owner', async () => {
      const owner = await createTestStudent()
      const member = await createTestStudent()
      const group = createGroup('WL Forbidden', '', owner.id)
      joinGroup(group.joinCode, member.id)
      const wordlistId = seedWordlist()

      expect(() => assignWordlist(group.id, member.id, wordlistId))
        .toThrow('You must be a group owner or admin')
    })
  })

  describe('unassignWordlist', () => {
    it('removes a wordlist from a group', async () => {
      const owner = await createTestStudent()
      const group = createGroup('Unassign Test', '', owner.id)
      const wordlistId = seedWordlist()
      assignWordlist(group.id, owner.id, wordlistId)

      unassignWordlist(group.id, owner.id, wordlistId)

      const detail = getGroupDetail(group.id)
      expect(detail!.wordlists).toHaveLength(0)
    })
  })

  describe('canAccessGroup', () => {
    it('returns true for admin role regardless of membership', async () => {
      const owner = await createTestStudent()
      const group = createGroup('Access Test', '', owner.id)

      expect(canAccessGroup(group.id, 99999, 'admin')).toBe(true)
    })

    it('returns true for group members', async () => {
      const owner = await createTestStudent()
      const group = createGroup('Member Access', '', owner.id)

      expect(canAccessGroup(group.id, owner.id, 'student')).toBe(true)
    })

    it('returns false for non-members', async () => {
      const owner = await createTestStudent()
      const outsider = await createTestStudent()
      const group = createGroup('No Access', '', owner.id)

      expect(canAccessGroup(group.id, outsider.id, 'student')).toBe(false)
    })
  })
})
