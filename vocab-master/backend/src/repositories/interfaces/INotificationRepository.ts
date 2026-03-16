import type { NotificationRow, NotificationType } from '../../types/index.js';

export interface INotificationRepository {
  findById(id: number): NotificationRow | undefined;
  findByUserId(userId: number, limit?: number): NotificationRow[];
  getUnreadCount(userId: number): number;
  create(userId: number, type: NotificationType, title: string, message: string, data?: Record<string, unknown>): NotificationRow;
  markAsRead(id: number, userId: number): boolean;
  markAllAsRead(userId: number): number;
  markAsActed(id: number, userId: number): boolean;
  delete(id: number, userId: number): boolean;
}
