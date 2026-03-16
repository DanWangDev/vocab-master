// Authentication API endpoints

import { baseApi } from './baseApi';
import type { User, AuthResponse, ApiError } from './types';

export const authApi = {
  /**
   * @deprecated Use registerStudent or registerParent instead
   */
  async register(username: string, password: string, displayName?: string): Promise<AuthResponse> {
    return authApi.registerStudent(username, password, displayName);
  },

  async registerStudent(
    username: string,
    password: string,
    displayName?: string,
    turnstileToken?: string
  ): Promise<AuthResponse> {
    const response = await fetch(`${baseApi.getBaseUrl()}/auth/register/student`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password, displayName, turnstileToken }),
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'Unknown Error',
        message: 'Registration failed'
      }));
      throw new Error(errorData.message);
    }

    const data: AuthResponse = await response.json();
    baseApi.setTokens(data.tokens);
    return data;
  },

  async registerParent(
    username: string,
    password: string,
    email: string,
    displayName?: string,
    turnstileToken?: string
  ): Promise<AuthResponse> {
    const response = await fetch(`${baseApi.getBaseUrl()}/auth/register/parent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password, email, displayName, turnstileToken }),
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'Unknown Error',
        message: 'Registration failed'
      }));
      throw new Error(errorData.message);
    }

    const data: AuthResponse = await response.json();
    baseApi.setTokens(data.tokens);
    return data;
  },

  async googleAuth(
    token: string,
    tokenType: 'id_token' | 'access_token' = 'id_token',
    username?: string
  ): Promise<AuthResponse & { isNewUser: boolean }> {
    const response = await fetch(`${baseApi.getBaseUrl()}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token, tokenType, username }),
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'Unknown Error',
        message: 'Google authentication failed'
      }));
      throw new Error(errorData.message);
    }

    const data = await response.json();
    baseApi.setTokens(data.tokens);
    return data;
  },

  async updateProfile(data: { username?: string; displayName?: string }): Promise<{ user: User }> {
    return baseApi.fetchWithAuth<{ user: User }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async createStudentForParent(
    username: string,
    password: string,
    displayName?: string
  ): Promise<{ success: boolean; user: User }> {
    return baseApi.fetchWithAuth<{ success: boolean; user: User }>('/auth/create-student', {
      method: 'POST',
      body: JSON.stringify({ username, password, displayName }),
    });
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await fetch(`${baseApi.getBaseUrl()}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'Unknown Error',
        message: 'Password reset request failed'
      }));
      throw new Error(errorData.message);
    }

    return response.json();
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const response = await fetch(`${baseApi.getBaseUrl()}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token, password }),
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'Unknown Error',
        message: 'Password reset failed'
      }));
      throw new Error(errorData.message);
    }

    return response.json();
  },

  async validateResetToken(token: string): Promise<{ valid: boolean }> {
    const response = await fetch(`${baseApi.getBaseUrl()}/auth/validate-reset-token/${token}`);

    if (!response.ok) {
      return { valid: false };
    }

    return response.json();
  },

  async resetUserPassword(userId: number, password: string): Promise<{ success: boolean; message: string }> {
    return baseApi.fetchWithAuth<{ success: boolean; message: string }>(`/admin/users/${userId}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ password }),
    });
  },

  async login(username: string, password: string, turnstileToken?: string): Promise<AuthResponse> {
    const response = await fetch(`${baseApi.getBaseUrl()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password, turnstileToken }),
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'Unknown Error',
        message: 'Login failed'
      }));
      throw new Error(errorData.message);
    }

    const data: AuthResponse = await response.json();
    baseApi.setTokens(data.tokens);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${baseApi.getBaseUrl()}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
    } catch {
      // Ignore logout errors
    }
    baseApi.clearTokens();
  },

  async getCurrentUser(): Promise<User | null> {
    if (!baseApi.hasTokens()) {
      return null;
    }

    try {
      const data = await baseApi.fetchWithAuth<{ user: User }>('/auth/me');
      return data.user;
    } catch {
      return null;
    }
  },
};
