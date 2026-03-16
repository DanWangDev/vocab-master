import { describe, it, expect } from 'vitest'
import { createTestStudent, createTestParent } from '../../test/helpers'
import { linkRequestRepository, notificationRepository } from '../index.js'

describe('SqliteLinkRequestRepository', () => {
  describe('create', () => {
    it('creates link request and notification for student', async () => {
      const parent = await createTestParent({ displayName: 'ParentName' })
      const student = await createTestStudent()

      const request = linkRequestRepository.create(parent.id, student.id, 'Please link')

      expect(request).toBeDefined()
      expect(request.id).toBeGreaterThan(0)
      expect(request.parent_id).toBe(parent.id)
      expect(request.student_id).toBe(student.id)
      expect(request.status).toBe('pending')
      expect(request.message).toBe('Please link')
      expect(request.notification_id).not.toBeNull()

      // Verify notification was created for the student
      const notifications = notificationRepository.findByUserId(student.id)
      expect(notifications).toHaveLength(1)
      expect(notifications[0].type).toBe('link_request')
      expect(notifications[0].user_id).toBe(student.id)
    })

    it('creates request without message', async () => {
      const parent = await createTestParent()
      const student = await createTestStudent()

      const request = linkRequestRepository.create(parent.id, student.id)
      expect(request.message).toBeNull()
    })
  })

  describe('findById', () => {
    it('returns link request', async () => {
      const parent = await createTestParent()
      const student = await createTestStudent()
      const created = linkRequestRepository.create(parent.id, student.id)

      const found = linkRequestRepository.findById(created.id)
      expect(found).toBeDefined()
      expect(found!.id).toBe(created.id)
    })

    it('returns undefined for non-existent', () => {
      const found = linkRequestRepository.findById(99999)
      expect(found).toBeUndefined()
    })
  })

  describe('findByIdWithUsers', () => {
    it('returns request with joined user data', async () => {
      const parent = await createTestParent({ displayName: 'Parent Display' })
      const student = await createTestStudent({ displayName: 'Student Display' })
      const created = linkRequestRepository.create(parent.id, student.id)

      const found = linkRequestRepository.findByIdWithUsers(created.id)
      expect(found).toBeDefined()
      expect(found!.parent_username).toBe(parent.username)
      expect(found!.parent_display_name).toBe('Parent Display')
      expect(found!.student_username).toBe(student.username)
      expect(found!.student_display_name).toBe('Student Display')
    })
  })

  describe('searchStudents', () => {
    it('finds unlinked students by username', async () => {
      const parent = await createTestParent()
      await createTestStudent({ username: 'searchable_student' })

      const results = linkRequestRepository.searchStudents('searchable', parent.id)
      expect(results.length).toBeGreaterThanOrEqual(1)
      expect(results[0].username).toBe('searchable_student')
      expect(results[0].status).toBe('available')
    })

    it('marks pending status for students with pending requests', async () => {
      const parent = await createTestParent()
      const student = await createTestStudent({ username: 'pending_target' })

      linkRequestRepository.create(parent.id, student.id)

      const results = linkRequestRepository.searchStudents('pending_target', parent.id)
      expect(results.length).toBe(1)
      expect(results[0].status).toBe('pending')
    })

    it('does not return already-linked students', async () => {
      const parent = await createTestParent()
      await createTestStudent({ username: 'linked_child', parentId: parent.id })

      const results = linkRequestRepository.searchStudents('linked_child', parent.id)
      expect(results).toHaveLength(0)
    })
  })

  describe('hasPendingRequest', () => {
    it('returns true when pending request exists', async () => {
      const parent = await createTestParent()
      const student = await createTestStudent()

      linkRequestRepository.create(parent.id, student.id)

      expect(linkRequestRepository.hasPendingRequest(parent.id, student.id)).toBe(true)
    })

    it('returns false when no pending request', async () => {
      const parent = await createTestParent()
      const student = await createTestStudent()

      expect(linkRequestRepository.hasPendingRequest(parent.id, student.id)).toBe(false)
    })
  })

  describe('findByParent / findPendingByParent', () => {
    it('returns all requests for parent', async () => {
      const parent = await createTestParent()
      const student1 = await createTestStudent()
      const student2 = await createTestStudent()

      linkRequestRepository.create(parent.id, student1.id)
      const req2 = linkRequestRepository.create(parent.id, student2.id)
      linkRequestRepository.reject(req2.id, student2.id)

      const all = linkRequestRepository.findByParent(parent.id)
      expect(all).toHaveLength(2)

      const pending = linkRequestRepository.findPendingByParent(parent.id)
      expect(pending).toHaveLength(1)
    })
  })

  describe('findByStudent / findPendingByStudent', () => {
    it('returns all requests for student', async () => {
      const parent1 = await createTestParent()
      const parent2 = await createTestParent()
      const student = await createTestStudent()

      linkRequestRepository.create(parent1.id, student.id)
      const req2 = linkRequestRepository.create(parent2.id, student.id)
      linkRequestRepository.reject(req2.id, student.id)

      const all = linkRequestRepository.findByStudent(student.id)
      expect(all).toHaveLength(2)

      const pending = linkRequestRepository.findPendingByStudent(student.id)
      expect(pending).toHaveLength(1)
    })
  })

  describe('accept', () => {
    it('links student to parent, cancels other pending, creates notification', async () => {
      const parent1 = await createTestParent()
      const parent2 = await createTestParent()
      const student = await createTestStudent()

      const req1 = linkRequestRepository.create(parent1.id, student.id)
      const req2 = linkRequestRepository.create(parent2.id, student.id)

      const result = linkRequestRepository.accept(req1.id, student.id)
      expect(result).toBe(true)

      // Verify student is linked to parent1
      const { userRepository } = await import('../index.js')
      const updatedStudent = userRepository.findById(student.id)
      expect(updatedStudent!.parent_id).toBe(parent1.id)

      // Verify req1 is accepted
      const acceptedReq = linkRequestRepository.findById(req1.id)
      expect(acceptedReq!.status).toBe('accepted')
      expect(acceptedReq!.responded_at).not.toBeNull()

      // Verify req2 is cancelled
      const cancelledReq = linkRequestRepository.findById(req2.id)
      expect(cancelledReq!.status).toBe('cancelled')

      // Verify notification to parent1
      const parentNotifications = notificationRepository.findByUserId(parent1.id)
      const acceptNotification = parentNotifications.find(n => n.type === 'link_accepted')
      expect(acceptNotification).toBeDefined()
    })

    it('returns false for already-linked student', async () => {
      const parent1 = await createTestParent()
      const parent2 = await createTestParent()
      const student = await createTestStudent({ parentId: parent1.id })

      const req = linkRequestRepository.create(parent2.id, student.id)
      const result = linkRequestRepository.accept(req.id, student.id)
      expect(result).toBe(false)
    })
  })

  describe('reject', () => {
    it('updates status and creates rejection notification', async () => {
      const parent = await createTestParent()
      const student = await createTestStudent()
      const req = linkRequestRepository.create(parent.id, student.id)

      const result = linkRequestRepository.reject(req.id, student.id)
      expect(result).toBe(true)

      const rejected = linkRequestRepository.findById(req.id)
      expect(rejected!.status).toBe('rejected')
      expect(rejected!.responded_at).not.toBeNull()

      // Parent should get rejection notification
      const parentNotifications = notificationRepository.findByUserId(parent.id)
      const rejectNotification = parentNotifications.find(n => n.type === 'link_rejected')
      expect(rejectNotification).toBeDefined()
    })

    it('returns false for non-pending request', async () => {
      const parent = await createTestParent()
      const student = await createTestStudent()
      const req = linkRequestRepository.create(parent.id, student.id)

      linkRequestRepository.reject(req.id, student.id)
      // Try rejecting again
      const result = linkRequestRepository.reject(req.id, student.id)
      expect(result).toBe(false)
    })
  })

  describe('cancel', () => {
    it('cancels request and deletes student notification', async () => {
      const parent = await createTestParent()
      const student = await createTestStudent()
      const req = linkRequestRepository.create(parent.id, student.id)

      // Verify notification exists before cancel
      const notifsBefore = notificationRepository.findByUserId(student.id)
      expect(notifsBefore).toHaveLength(1)

      const result = linkRequestRepository.cancel(req.id, parent.id)
      expect(result).toBe(true)

      const cancelled = linkRequestRepository.findById(req.id)
      expect(cancelled!.status).toBe('cancelled')

      // Student's notification should be deleted
      const notifsAfter = notificationRepository.findByUserId(student.id)
      expect(notifsAfter).toHaveLength(0)
    })

    it('returns false for wrong parent', async () => {
      const parent1 = await createTestParent()
      const parent2 = await createTestParent()
      const student = await createTestStudent()
      const req = linkRequestRepository.create(parent1.id, student.id)

      const result = linkRequestRepository.cancel(req.id, parent2.id)
      expect(result).toBe(false)
    })

    it('returns false for non-pending request', async () => {
      const parent = await createTestParent()
      const student = await createTestStudent()
      const req = linkRequestRepository.create(parent.id, student.id)

      linkRequestRepository.reject(req.id, student.id)
      const result = linkRequestRepository.cancel(req.id, parent.id)
      expect(result).toBe(false)
    })
  })
})
