import type { GroupRow, GroupMemberRow, GroupWithMemberCount, GroupMemberWithUser, GroupWordlistRow } from '../../types/index.js';

export interface IGroupRepository {
  create(name: string, description: string, createdBy: number, joinCode: string, maxMembers: number): GroupRow;
  findById(id: number): GroupRow | undefined;
  findByJoinCode(joinCode: string): GroupRow | undefined;
  findByUserId(userId: number): GroupWithMemberCount[];
  findByCreatedBy(createdBy: number): GroupWithMemberCount[];
  update(id: number, data: { name?: string; description?: string }): GroupRow | undefined;
  remove(id: number): void;

  // Members
  addMember(groupId: number, userId: number, role: 'owner' | 'admin' | 'member'): GroupMemberRow;
  removeMember(groupId: number, userId: number): void;
  findMembers(groupId: number): GroupMemberWithUser[];
  findMember(groupId: number, userId: number): GroupMemberRow | undefined;
  updateMemberRole(groupId: number, userId: number, role: 'owner' | 'admin' | 'member'): void;
  getMemberCount(groupId: number): number;

  // Wordlists
  assignWordlist(groupId: number, wordlistId: number): GroupWordlistRow;
  unassignWordlist(groupId: number, wordlistId: number): void;
  findWordlists(groupId: number): GroupWordlistRow[];
  findGroupWordlistIds(userId: number): number[];
}
