// Authentication API endpoints (hub OIDC)

import { baseApi } from './baseApi';
import type { User } from './types';

export const authApi = {
  async updateProfile(data: { username?: string; displayName?: string }): Promise<{ user: User }> {
    return baseApi.fetchWithAuth<{ user: User }>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async createStudentForParent(
    username: string,
    password: string,
    displayName?: string
  ): Promise<{ success: boolean; user: User }> {
    return baseApi.fetchWithAuth<{ success: boolean; user: User }>('/api/auth/create-student', {
      method: 'POST',
      body: JSON.stringify({ username, password, displayName }),
    });
  },

  async resetUserPassword(userId: number, password: string): Promise<{ success: boolean; message: string }> {
    return baseApi.fetchWithAuth<{ success: boolean; message: string }>(`/api/admin/users/${userId}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ password }),
    });
  },

  async logout(): Promise<void> {
    baseApi.clearTokens();
  },

  async getCurrentUser(): Promise<User | null> {
    if (!baseApi.hasTokens()) {
      return null;
    }

    try {
      const data = await baseApi.fetchWithAuth<{ user: User }>('/api/auth/me');
      return data.user;
    } catch {
      return null;
    }
  },
};
