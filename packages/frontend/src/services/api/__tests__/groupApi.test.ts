import { describe, it, expect, vi, beforeEach } from 'vitest';
import { groupApi } from '../groupApi';
import { baseApi } from '../baseApi';

vi.mock('../baseApi', () => ({
  baseApi: {
    fetchWithAuth: vi.fn(),
  },
}));

describe('groupApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getGroups calls correct endpoint', async () => {
    const mockData = { groups: [{ id: 1, name: 'Class A' }] };
    vi.mocked(baseApi.fetchWithAuth).mockResolvedValue(mockData);

    const result = await groupApi.getGroups();
    expect(baseApi.fetchWithAuth).toHaveBeenCalledWith('/groups');
    expect(result).toEqual(mockData);
  });

  it('getGroup calls correct endpoint', async () => {
    const mockData = { id: 1, name: 'Class A', members: [] };
    vi.mocked(baseApi.fetchWithAuth).mockResolvedValue(mockData);

    const result = await groupApi.getGroup(1);
    expect(baseApi.fetchWithAuth).toHaveBeenCalledWith('/groups/1');
    expect(result).toEqual(mockData);
  });

  it('createGroup sends POST with body', async () => {
    vi.mocked(baseApi.fetchWithAuth).mockResolvedValue({ id: 1 });

    await groupApi.createGroup('My Class', 'Desc', 30);
    expect(baseApi.fetchWithAuth).toHaveBeenCalledWith('/groups', {
      method: 'POST',
      body: JSON.stringify({ name: 'My Class', description: 'Desc', maxMembers: 30 }),
    });
  });

  it('joinGroup sends POST with join code', async () => {
    vi.mocked(baseApi.fetchWithAuth).mockResolvedValue({ id: 1 });

    await groupApi.joinGroup('ABC123');
    expect(baseApi.fetchWithAuth).toHaveBeenCalledWith('/groups/join', {
      method: 'POST',
      body: JSON.stringify({ joinCode: 'ABC123' }),
    });
  });

  it('deleteGroup sends DELETE', async () => {
    vi.mocked(baseApi.fetchWithAuth).mockResolvedValue(undefined);

    await groupApi.deleteGroup(5);
    expect(baseApi.fetchWithAuth).toHaveBeenCalledWith('/groups/5', { method: 'DELETE' });
  });

  it('assignWordlist sends POST', async () => {
    vi.mocked(baseApi.fetchWithAuth).mockResolvedValue(undefined);

    await groupApi.assignWordlist(1, 42);
    expect(baseApi.fetchWithAuth).toHaveBeenCalledWith('/groups/1/wordlists', {
      method: 'POST',
      body: JSON.stringify({ wordlistId: 42 }),
    });
  });
});
