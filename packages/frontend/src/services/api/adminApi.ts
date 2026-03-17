// Admin and parent threshold API endpoints

import { baseApi } from './baseApi';
import type { AdminUserStats, AdminUserDetails, ParentThresholds } from './types';

export const adminApi = {
  async getAdminUsers(): Promise<AdminUserStats[]> {
    return baseApi.fetchWithAuth<AdminUserStats[]>('/admin/users');
  },

  async getAdminUserDetails(userId: number): Promise<AdminUserDetails> {
    return baseApi.fetchWithAuth<AdminUserDetails>(`/admin/users/${userId}/details`);
  },

  async updateUserRole(userId: number, role: 'student' | 'parent' | 'admin'): Promise<void> {
    return baseApi.fetchWithAuth<void>(`/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  async updateUserParent(userId: number, parentId: number | null): Promise<void> {
    return baseApi.fetchWithAuth<void>(`/admin/users/${userId}/parent`, {
      method: 'PATCH',
      body: JSON.stringify({ parentId }),
    });
  },

  async createUser(data: {
    username: string;
    password: string;
    role: string;
    parentId: number | null;
    email?: string;
  }): Promise<void> {
    return baseApi.fetchWithAuth<void>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateUserEmail(userId: number, email: string | null): Promise<void> {
    return baseApi.fetchWithAuth<void>(`/admin/users/${userId}/email`, {
      method: 'PATCH',
      body: JSON.stringify({ email }),
    });
  },

  async deleteUser(userId: number): Promise<{ success: boolean; message: string }> {
    return baseApi.fetchWithAuth<{ success: boolean; message: string }>(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  async getThresholds(): Promise<ParentThresholds> {
    return baseApi.fetchWithAuth<ParentThresholds>('/admin/thresholds');
  },

  async updateThresholds(thresholds: ParentThresholds): Promise<ParentThresholds> {
    return baseApi.fetchWithAuth<ParentThresholds>('/admin/thresholds', {
      method: 'PUT',
      body: JSON.stringify(thresholds),
    });
  },
};
