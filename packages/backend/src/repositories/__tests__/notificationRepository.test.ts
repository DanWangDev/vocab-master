import { describe, it, expect } from 'vitest'
import { getTestDb, createTestStudent, createTestParent } from '../../test/helpers'
import { notificationRepository } from '../index.js'

describe('SqliteNotificationRepository', () => {
  describe('create', () => {
    it('creates notification with all fields', async () => {
      const student = await createTestStudent()

      const notification = notificationRepository.create(
        student.id,
        'achievement',
        'New Achievement',
        'You earned a badge!',
        { badge: 'first_quiz' }
      )

      expect(notification).toBeDefined()
      expect(notification.id).toBeGreaterThan(0)
      expect(notification.user_id).toBe(student.id)
      expect(notification.type).toBe('achievement')
      expect(notification.title).toBe('New Achievement')
      expect(notification.message).toBe('You earned a badge!')
      expect(notification.read_at).toBeNull()
      expect(notification.acted_at).toBeNull()
      expect(notification.created_at).toBeDefined()
    })

    it('stores JSON data', async () => {
      const student = await createTestStudent()

      const notification = notificationRepository.create(
        student.id,
        'reminder',
        'Study Reminder',
        'Time to study!',
        { key: 'value', nested: { a: 1 } }
      )

      expect(notification.data).toBeDefined()
      const parsed = JSON.parse(notification.data!)
      expect(parsed.key).toBe('value')
      expect(parsed.nested.a).toBe(1)
    })

    it('handles null data', async () => {
      const student = await createTestStudent()

      const notification = notificationRepository.create(
        student.id,
        'reminder',
        'No Data',
        'Message'
      )

      expect(notification.data).toBeNull()
    })
  })

  describe('findById', () => {
    it('returns notification', async () => {
      const student = await createTestStudent()
      const created = notificationRepository.create(student.id, 'achievement', 'Title', 'Msg')

      const found = notificationRepository.findById(created.id)
      expect(found).toBeDefined()
      expect(found!.id).toBe(created.id)
    })

    it('returns undefined for non-existent', () => {
      const found = notificationRepository.findById(99999)
      expect(found).toBeUndefined()
    })
  })

  describe('findByUserId', () => {
    it('returns in DESC order by created_at', async () => {
      const student = await createTestStudent()
      const db = getTestDb()

      // Create notifications with explicit timestamps to ensure ordering
      const n1 = notificationRepository.create(student.id, 'achievement', 'First', 'Msg1')
      db.prepare("UPDATE notifications SET created_at = datetime('now', '-2 minutes') WHERE id = ?").run(n1.id)

      const n2 = notificationRepository.create(student.id, 'achievement', 'Second', 'Msg2')
      db.prepare("UPDATE notifications SET created_at = datetime('now', '-1 minutes') WHERE id = ?").run(n2.id)

      const n3 = notificationRepository.create(student.id, 'achievement', 'Third', 'Msg3')

      const results = notificationRepository.findByUserId(student.id)

      expect(results).toHaveLength(3)
      expect(results[0].id).toBe(n3.id)
      expect(results[1].id).toBe(n2.id)
      expect(results[2].id).toBe(n1.id)
    })

    it('respects limit', async () => {
      const student = await createTestStudent()
      notificationRepository.create(student.id, 'achievement', 'First', 'Msg')
      notificationRepository.create(student.id, 'achievement', 'Second', 'Msg')
      notificationRepository.create(student.id, 'achievement', 'Third', 'Msg')

      const results = notificationRepository.findByUserId(student.id, 2)
      expect(results).toHaveLength(2)
    })
  })

  describe('getUnreadCount', () => {
    it('counts only unread (read_at IS NULL)', async () => {
      const student = await createTestStudent()
      const n1 = notificationRepository.create(student.id, 'achievement', 'A', 'Msg')
      notificationRepository.create(student.id, 'achievement', 'B', 'Msg')
      notificationRepository.create(student.id, 'achievement', 'C', 'Msg')

      notificationRepository.markAsRead(n1.id, student.id)

      const count = notificationRepository.getUnreadCount(student.id)
      expect(count).toBe(2)
    })
  })

  describe('markAsRead', () => {
    it('marks as read', async () => {
      const student = await createTestStudent()
      const n = notificationRepository.create(student.id, 'achievement', 'Title', 'Msg')

      const result = notificationRepository.markAsRead(n.id, student.id)
      expect(result).toBe(true)

      const updated = notificationRepository.findById(n.id)
      expect(updated!.read_at).not.toBeNull()
    })

    it('returns false for wrong user', async () => {
      const student1 = await createTestStudent()
      const student2 = await createTestStudent()
      const n = notificationRepository.create(student1.id, 'achievement', 'Title', 'Msg')

      const result = notificationRepository.markAsRead(n.id, student2.id)
      expect(result).toBe(false)
    })

    it('returns false when already read', async () => {
      const student = await createTestStudent()
      const n = notificationRepository.create(student.id, 'achievement', 'Title', 'Msg')

      notificationRepository.markAsRead(n.id, student.id)
      const result = notificationRepository.markAsRead(n.id, student.id)
      expect(result).toBe(false)
    })
  })

  describe('markAllAsRead', () => {
    it('marks all unread as read, returns count', async () => {
      const student = await createTestStudent()
      notificationRepository.create(student.id, 'achievement', 'A', 'Msg')
      notificationRepository.create(student.id, 'achievement', 'B', 'Msg')
      const n3 = notificationRepository.create(student.id, 'achievement', 'C', 'Msg')

      notificationRepository.markAsRead(n3.id, student.id)

      const count = notificationRepository.markAllAsRead(student.id)
      expect(count).toBe(2) // only 2 were unread

      const unread = notificationRepository.getUnreadCount(student.id)
      expect(unread).toBe(0)
    })
  })

  describe('markAsActed', () => {
    it('sets acted_at and read_at', async () => {
      const student = await createTestStudent()
      const n = notificationRepository.create(student.id, 'link_request', 'Title', 'Msg')

      const result = notificationRepository.markAsActed(n.id, student.id)
      expect(result).toBe(true)

      const updated = notificationRepository.findById(n.id)
      expect(updated!.acted_at).not.toBeNull()
      expect(updated!.read_at).not.toBeNull()
    })

    it('returns false for wrong user', async () => {
      const student1 = await createTestStudent()
      const student2 = await createTestStudent()
      const n = notificationRepository.create(student1.id, 'link_request', 'Title', 'Msg')

      const result = notificationRepository.markAsActed(n.id, student2.id)
      expect(result).toBe(false)
    })
  })

  describe('delete', () => {
    it('deletes notification', async () => {
      const student = await createTestStudent()
      const n = notificationRepository.create(student.id, 'achievement', 'Title', 'Msg')

      const result = notificationRepository.delete(n.id, student.id)
      expect(result).toBe(true)

      const found = notificationRepository.findById(n.id)
      expect(found).toBeUndefined()
    })

    it('returns false for wrong user', async () => {
      const student1 = await createTestStudent()
      const student2 = await createTestStudent()
      const n = notificationRepository.create(student1.id, 'achievement', 'Title', 'Msg')

      const result = notificationRepository.delete(n.id, student2.id)
      expect(result).toBe(false)

      // Should still exist
      const found = notificationRepository.findById(n.id)
      expect(found).toBeDefined()
    })
  })
})
