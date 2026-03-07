import { Router, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { validate, createLinkRequestSchema, linkRequestActionSchema } from '../middleware/validate.js';
import { linkRequestRepository, userRepository } from '../repositories/index.js';
import { pushNotificationService } from '../services/index.js';
import { logger } from '../services/logger.js';
import type { AuthRequest, LinkRequest, CreateLinkRequestRequest, LinkRequestActionRequest } from '../types/index.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Convert database row to API response format
function toLinkRequest(row: {
  id: number;
  parent_id: number;
  student_id: number;
  status: string;
  notification_id: number | null;
  message: string | null;
  responded_at: string | null;
  created_at: string;
  parent_username?: string;
  parent_display_name?: string | null;
  student_username?: string;
  student_display_name?: string | null;
}): LinkRequest {
  return {
    id: row.id,
    parentId: row.parent_id,
    studentId: row.student_id,
    status: row.status as LinkRequest['status'],
    notificationId: row.notification_id,
    message: row.message,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
    parentUsername: row.parent_username,
    parentDisplayName: row.parent_display_name,
    studentUsername: row.student_username,
    studentDisplayName: row.student_display_name
  };
}

// GET /api/link-requests/search?q= - Search students by username (parent only)
router.get('/search', requireRole(['parent']), (req: AuthRequest, res: Response) => {
  try {
    const query = req.query.q;

    // Validate query parameter
    if (typeof query !== 'string' || query.length < 2) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Search query must be at least 2 characters'
      });
      return;
    }

    // Limit query length to prevent abuse
    if (query.length > 50) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Search query must be at most 50 characters'
      });
      return;
    }

    const parentId = req.user!.userId;
    const results = linkRequestRepository.searchStudents(query, parentId);

    res.json({ results });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to search students'
    });
  }
});

// POST /api/link-requests - Send link request to student (parent only)
router.post('/', requireRole(['parent']), validate(createLinkRequestSchema), (req: AuthRequest, res: Response) => {
  try {
    const parentId = req.user!.userId;
    const { studentId, message } = req.body as CreateLinkRequestRequest;

    // Check if student exists and is a student
    const student = userRepository.findById(studentId);
    if (!student || student.role !== 'student') {
      res.status(404).json({
        error: 'Not Found',
        message: 'Student not found'
      });
      return;
    }

    // Check if student is already linked
    if (student.parent_id !== null) {
      res.status(409).json({
        error: 'Conflict',
        message: 'Student is already linked to a parent'
      });
      return;
    }

    // Check for existing pending request
    if (linkRequestRepository.hasPendingRequest(parentId, studentId)) {
      res.status(409).json({
        error: 'Conflict',
        message: 'You already have a pending request for this student'
      });
      return;
    }

    const request = linkRequestRepository.create(parentId, studentId, message);

    // Send push notification to student
    const parent = userRepository.findById(parentId);
    const parentName = parent?.display_name || parent?.username || 'A parent';
    pushNotificationService.sendToUser(
      studentId,
      'New Link Request',
      `${parentName} wants to link their account with yours`,
      { type: 'link_request', linkRequestId: request.id }
    ).catch(err => logger.error('Push notification failed', { error: String(err) }));

    res.status(201).json({
      success: true,
      request: toLinkRequest(request as unknown as Parameters<typeof toLinkRequest>[0])
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to create link request'
    });
  }
});

// GET /api/link-requests - Get pending requests
// Parents see their sent requests, students see received requests
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const role = req.user!.role;

    let requests;
    if (role === 'parent') {
      requests = linkRequestRepository.findPendingByParent(userId);
    } else if (role === 'student') {
      requests = linkRequestRepository.findPendingByStudent(userId);
    } else {
      // Admin can see all (or we could restrict)
      res.status(403).json({
        error: 'Forbidden',
        message: 'This endpoint is for parents and students only'
      });
      return;
    }

    res.json({
      requests: requests.map(toLinkRequest)
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to fetch link requests'
    });
  }
});

// PATCH /api/link-requests/:id - Accept or reject request (student only)
router.patch('/:id', requireRole(['student']), validate(linkRequestActionSchema), (req: AuthRequest, res: Response) => {
  try {
    const studentId = req.user!.userId;
    const requestId = parseInt(req.params.id as string, 10);
    const { action } = req.body as LinkRequestActionRequest;

    if (isNaN(requestId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request ID'
      });
      return;
    }

    let success: boolean;
    if (action === 'accept') {
      success = linkRequestRepository.accept(requestId, studentId);
    } else {
      success = linkRequestRepository.reject(requestId, studentId);
    }

    if (!success) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Link request not found or cannot be modified'
      });
      return;
    }

    // Send push notification to parent
    const linkRequest = linkRequestRepository.findByIdWithUsers(requestId);
    if (linkRequest) {
      const studentName = linkRequest.student_display_name || linkRequest.student_username;
      const title = action === 'accept' ? 'Link Request Accepted' : 'Link Request Declined';
      const body = action === 'accept'
        ? `${studentName} has accepted your link request`
        : `${studentName} has declined your link request`;
      pushNotificationService.sendToUser(
        linkRequest.parent_id,
        title,
        body,
        { type: action === 'accept' ? 'link_accepted' : 'link_rejected' }
      ).catch(err => logger.error('Push notification failed', { error: String(err) }));
    }

    res.json({
      success: true,
      message: action === 'accept' ? 'Link request accepted' : 'Link request rejected'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to process link request'
    });
  }
});

// DELETE /api/link-requests/:id - Cancel pending request (parent only)
router.delete('/:id', requireRole(['parent']), (req: AuthRequest, res: Response) => {
  try {
    const parentId = req.user!.userId;
    const requestId = parseInt(req.params.id as string, 10);

    if (isNaN(requestId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid request ID'
      });
      return;
    }

    const success = linkRequestRepository.cancel(requestId, parentId);

    if (!success) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Link request not found or cannot be cancelled'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Link request cancelled'
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to cancel link request'
    });
  }
});

export default router;
