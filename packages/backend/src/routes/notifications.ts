import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { notificationRepository } from '../repositories/index.js';
import type { AuthRequest, Notification, NotificationRow } from '../types/index.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Convert database row to API response format
function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    data: row.data ? JSON.parse(row.data) : null,
    readAt: row.read_at,
    actedAt: row.acted_at,
    createdAt: row.created_at
  };
}

// GET /api/notifications - Get user's notifications with unread count
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const notifications = notificationRepository.findByUserId(userId);
    const unreadCount = notificationRepository.getUnreadCount(userId);

    res.json({
      notifications: notifications.map(toNotification),
      unreadCount
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to fetch notifications'
    });
  }
});

// GET /api/notifications/count - Get unread notification count only
router.get('/count', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const count = notificationRepository.getUnreadCount(userId);

    res.json({ count });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to fetch notification count'
    });
  }
});

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch('/:id/read', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const notificationId = parseInt(req.params.id as string, 10);

    if (isNaN(notificationId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid notification ID'
      });
      return;
    }

    const success = notificationRepository.markAsRead(notificationId, userId);

    if (!success) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Notification not found or already read'
      });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to mark notification as read'
    });
  }
});

// POST /api/notifications/read-all - Mark all notifications as read
router.post('/read-all', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const count = notificationRepository.markAllAsRead(userId);

    res.json({ success: true, markedCount: count });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to mark notifications as read'
    });
  }
});

export default router;
