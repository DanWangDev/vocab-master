import { baseApi } from './baseApi';

export interface GroupSummary {
  id: number;
  name: string;
  description: string;
  joinCode: string;
  memberCount: number;
  createdAt: string;
}

export interface GroupMemberDetail {
  userId: number;
  username: string;
  displayName: string | null;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface GroupWordlistDetail {
  wordlistId: number;
  name: string;
  wordCount: number;
  assignedAt: string;
}

export interface GroupDetail {
  id: number;
  name: string;
  description: string;
  joinCode: string;
  maxMembers: number;
  memberCount: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  members: GroupMemberDetail[];
  wordlists: GroupWordlistDetail[];
}

export const groupApi = {
  async getGroups(): Promise<{ groups: GroupSummary[] }> {
    return baseApi.fetchWithAuth('/api/groups');
  },

  async getGroup(id: number): Promise<GroupDetail> {
    return baseApi.fetchWithAuth(`/api/groups/${id}`);
  },

  async createGroup(name: string, description: string = '', maxMembers: number = 50): Promise<GroupDetail> {
    return baseApi.fetchWithAuth('/api/groups', {
      method: 'POST',
      body: JSON.stringify({ name, description, maxMembers }),
    });
  },

  async updateGroup(id: number, data: { name?: string; description?: string }): Promise<GroupDetail> {
    return baseApi.fetchWithAuth(`/api/groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteGroup(id: number): Promise<void> {
    await baseApi.fetchWithAuth(`/api/groups/${id}`, { method: 'DELETE' });
  },

  async joinGroup(joinCode: string): Promise<GroupDetail> {
    return baseApi.fetchWithAuth('/api/groups/join', {
      method: 'POST',
      body: JSON.stringify({ joinCode }),
    });
  },

  async removeMember(groupId: number, userId: number): Promise<void> {
    await baseApi.fetchWithAuth(`/api/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
  },

  async updateMemberRole(groupId: number, userId: number, role: 'admin' | 'member'): Promise<void> {
    await baseApi.fetchWithAuth(`/api/groups/${groupId}/members/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  async assignWordlist(groupId: number, wordlistId: number): Promise<void> {
    await baseApi.fetchWithAuth(`/api/groups/${groupId}/wordlists`, {
      method: 'POST',
      body: JSON.stringify({ wordlistId }),
    });
  },

  async unassignWordlist(groupId: number, wordlistId: number): Promise<void> {
    await baseApi.fetchWithAuth(`/api/groups/${groupId}/wordlists/${wordlistId}`, { method: 'DELETE' });
  },
};
