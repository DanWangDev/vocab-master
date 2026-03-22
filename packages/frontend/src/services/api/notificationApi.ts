// Notification API endpoints

import { baseApi } from './baseApi';
import type { NotificationsResponse, NotificationCountResponse } from './types';

export const notificationApi = {
  async getNotifications(): Promise<NotificationsResponse> {
    return baseApi.fetchWithAuth<NotificationsResponse>('/api/notifications');
  },

  async getNotificationCount(): Promise<NotificationCountResponse> {
    return baseApi.fetchWithAuth<NotificationCountResponse>('/api/notifications/count');
  },

  async markNotificationRead(id: number): Promise<{ success: boolean }> {
    return baseApi.fetchWithAuth<{ success: boolean }>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  async markAllNotificationsRead(): Promise<{ success: boolean; markedCount: number }> {
    return baseApi.fetchWithAuth<{ success: boolean; markedCount: number }>('/api/notifications/read-all', {
      method: 'POST',
    });
  },
};
