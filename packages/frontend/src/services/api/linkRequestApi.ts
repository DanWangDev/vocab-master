// Link request API endpoints

import { baseApi } from './baseApi';
import type { StudentSearchResult, LinkRequest } from './types';

export const linkRequestApi = {
  async searchStudents(query: string): Promise<{ results: StudentSearchResult[] }> {
    return baseApi.fetchWithAuth<{ results: StudentSearchResult[] }>(
      `/api/link-requests/search?q=${encodeURIComponent(query)}`
    );
  },

  async sendLinkRequest(
    studentId: number,
    message?: string
  ): Promise<{ success: boolean; request: LinkRequest }> {
    return baseApi.fetchWithAuth<{ success: boolean; request: LinkRequest }>('/api/link-requests', {
      method: 'POST',
      body: JSON.stringify({ studentId, message }),
    });
  },

  async getLinkRequests(): Promise<{ requests: LinkRequest[] }> {
    return baseApi.fetchWithAuth<{ requests: LinkRequest[] }>('/api/link-requests');
  },

  async respondToLinkRequest(
    id: number,
    action: 'accept' | 'reject'
  ): Promise<{ success: boolean; message: string }> {
    return baseApi.fetchWithAuth<{ success: boolean; message: string }>(`/api/link-requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action }),
    });
  },

  async cancelLinkRequest(id: number): Promise<{ success: boolean; message: string }> {
    return baseApi.fetchWithAuth<{ success: boolean; message: string }>(`/api/link-requests/${id}`, {
      method: 'DELETE',
    });
  },
};
