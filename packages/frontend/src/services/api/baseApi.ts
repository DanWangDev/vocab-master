// Base API with token management and authenticated fetch wrapper

import type { ApiError, TokenPair } from './types';

// Endpoints include /api prefix explicitly. VITE_API_URL is the server origin only.
// - Development: defaults to 'http://localhost:9876' (direct to backend)
// - Docker/Nginx: set to '' (empty) for relative URLs proxied by Nginx
// Backwards compat: strips trailing /api from old configs that included it.
function resolveBaseUrl(): string {
  const env = import.meta.env.VITE_API_URL;
  if (env == null) return 'http://localhost:9876';
  const stripped = env.replace(/\/api\/?$/, '');
  return stripped;
}
const API_BASE_URL = resolveBaseUrl();
const ACCESS_TOKEN_KEY = 'vocab_master_access_token';

class BaseApi {
  private accessToken: string | null = null;
  private refreshPromise: Promise<{ accessToken: string }> | null = null;

  constructor() {
    this.accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    // Refresh token is now stored as httpOnly cookie (managed by browser)
    // Clear any legacy refresh token from localStorage
    localStorage.removeItem('vocab_master_refresh_token');
  }

  setTokens(tokens: TokenPair | { accessToken: string }): void {
    this.accessToken = tokens.accessToken;
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    // Refresh token is set as httpOnly cookie by the backend
  }

  clearTokens(): void {
    this.accessToken = null;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  hasTokens(): boolean {
    return this.accessToken !== null;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getBaseUrl(): string {
    return API_BASE_URL;
  }

  async fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {},
    retry = true
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    // Handle 401 - try refresh (cookie sent automatically)
    if (response.status === 401 && retry) {
      try {
        await this.refreshAccessToken();
        return this.fetchWithAuth<T>(endpoint, options, false);
      } catch {
        this.clearTokens();
        throw new Error('Session expired. Please login again.');
      }
    }

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: 'Unknown Error',
        message: `Request failed with status ${response.status}`
      }));
      throw new Error(errorData.message);
    }

    return response.json();
  }

  private async refreshAccessToken(): Promise<{ accessToken: string }> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      this.setTokens(data.tokens);
      return data.tokens;
    })();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }
}

export const baseApi = new BaseApi();
