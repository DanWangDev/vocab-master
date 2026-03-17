import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../baseApi', () => ({
  baseApi: {
    fetchWithAuth: vi.fn(),
    getBaseUrl: vi.fn().mockReturnValue('http://localhost:9876/api'),
    setTokens: vi.fn(),
    clearTokens: vi.fn(),
    hasTokens: vi.fn(),
    getAccessToken: vi.fn(),
  },
}));

import { linkRequestApi } from '../linkRequestApi';
import { baseApi } from '../baseApi';

const mockFetchWithAuth = vi.mocked(baseApi.fetchWithAuth);

describe('linkRequestApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchStudents', () => {
    it('calls fetchWithAuth with encoded query param', async () => {
      const mockResponse = { results: [{ id: 1, username: 'student1', display_name: 'Student One' }] };
      mockFetchWithAuth.mockResolvedValueOnce(mockResponse);

      const result = await linkRequestApi.searchStudents('student');

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/link-requests/search?q=student');
      expect(result).toEqual(mockResponse);
    });

    it('encodes special characters in query', async () => {
      mockFetchWithAuth.mockResolvedValueOnce({ results: [] });

      await linkRequestApi.searchStudents('test user&foo');

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/link-requests/search?q=test%20user%26foo');
    });
  });

  describe('sendLinkRequest', () => {
    it('sends POST with studentId and message', async () => {
      const mockResponse = { success: true, request: { id: 1, status: 'pending' } };
      mockFetchWithAuth.mockResolvedValueOnce(mockResponse);

      const result = await linkRequestApi.sendLinkRequest(5, 'Please link me');

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/link-requests', {
        method: 'POST',
        body: JSON.stringify({ studentId: 5, message: 'Please link me' }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('sends POST without message', async () => {
      mockFetchWithAuth.mockResolvedValueOnce({ success: true, request: { id: 2, status: 'pending' } });

      await linkRequestApi.sendLinkRequest(3);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/link-requests', {
        method: 'POST',
        body: JSON.stringify({ studentId: 3, message: undefined }),
      });
    });
  });

  describe('getLinkRequests', () => {
    it('calls fetchWithAuth with GET /link-requests', async () => {
      const mockResponse = {
        requests: [
          { id: 1, status: 'pending', parent_id: 2, student_id: 3 },
          { id: 2, status: 'accepted', parent_id: 2, student_id: 4 },
        ],
      };
      mockFetchWithAuth.mockResolvedValueOnce(mockResponse);

      const result = await linkRequestApi.getLinkRequests();

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/link-requests');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('respondToLinkRequest', () => {
    it('sends PATCH with accept action', async () => {
      const mockResponse = { success: true, message: 'Link accepted' };
      mockFetchWithAuth.mockResolvedValueOnce(mockResponse);

      const result = await linkRequestApi.respondToLinkRequest(10, 'accept');

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/link-requests/10', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'accept' }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('sends PATCH with reject action', async () => {
      const mockResponse = { success: true, message: 'Link rejected' };
      mockFetchWithAuth.mockResolvedValueOnce(mockResponse);

      const result = await linkRequestApi.respondToLinkRequest(10, 'reject');

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/link-requests/10', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'reject' }),
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('cancelLinkRequest', () => {
    it('sends DELETE to /link-requests/:id', async () => {
      const mockResponse = { success: true, message: 'Link request cancelled' };
      mockFetchWithAuth.mockResolvedValueOnce(mockResponse);

      const result = await linkRequestApi.cancelLinkRequest(15);

      expect(mockFetchWithAuth).toHaveBeenCalledWith('/link-requests/15', {
        method: 'DELETE',
      });
      expect(result).toEqual(mockResponse);
    });
  });
});
