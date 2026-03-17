import { groupRepository, wordlistRepository } from '../repositories/index.js';
import { AppError } from '../errors/AppError.js';
import { logger } from './logger.js';
import crypto from 'crypto';
import type { GroupRow, GroupWithMemberCount, GroupMemberWithUser } from '../types/index.js';

function generateJoinCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
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

export interface GroupSummary {
  id: number;
  name: string;
  description: string;
  joinCode: string;
  memberCount: number;
  createdAt: string;
}

function toGroupSummary(row: GroupWithMemberCount): GroupSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    joinCode: row.join_code,
    memberCount: row.member_count,
    createdAt: row.created_at,
  };
}

export function createGroup(
  name: string,
  description: string,
  createdBy: number,
  maxMembers: number = 50
): GroupDetail {
  let joinCode = generateJoinCode();
  let attempts = 0;
  while (groupRepository.findByJoinCode(joinCode) && attempts < 10) {
    joinCode = generateJoinCode();
    attempts++;
  }
  if (attempts >= 10) {
    throw new AppError('Failed to generate unique join code', 500, 'JOIN_CODE_COLLISION');
  }

  const group = groupRepository.create(name, description, createdBy, joinCode, maxMembers);
  groupRepository.addMember(group.id, createdBy, 'owner');

  logger.info('Group created', { groupId: group.id, createdBy });

  return getGroupDetail(group.id)!;
}

export function getGroupsForUser(userId: number): GroupSummary[] {
  return groupRepository.findByUserId(userId).map(toGroupSummary);
}

export function getGroupsCreatedBy(userId: number): GroupSummary[] {
  return groupRepository.findByCreatedBy(userId).map(toGroupSummary);
}

export function getGroupDetail(groupId: number): GroupDetail | undefined {
  const group = groupRepository.findById(groupId);
  if (!group) return undefined;

  const members = groupRepository.findMembers(groupId);
  const wordlistAssignments = groupRepository.findWordlists(groupId);

  const wordlistDetails: GroupWordlistDetail[] = wordlistAssignments.map(gw => {
    const wl = wordlistRepository.findById(gw.wordlist_id);
    return {
      wordlistId: gw.wordlist_id,
      name: wl?.name || 'Unknown',
      wordCount: wl?.word_count || 0,
      assignedAt: gw.assigned_at,
    };
  });

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    joinCode: group.join_code,
    maxMembers: group.max_members,
    memberCount: members.length,
    createdBy: group.created_by,
    createdAt: group.created_at,
    updatedAt: group.updated_at,
    members: members.map(m => ({
      userId: m.user_id,
      username: m.username,
      displayName: m.display_name,
      role: m.role,
      joinedAt: m.joined_at,
    })),
    wordlists: wordlistDetails,
  };
}

export function updateGroup(groupId: number, userId: number, data: { name?: string; description?: string }): GroupDetail {
  assertGroupAdmin(groupId, userId);
  groupRepository.update(groupId, data);
  logger.info('Group updated', { groupId, userId });
  return getGroupDetail(groupId)!;
}

export function deleteGroup(groupId: number, userId: number): void {
  const member = groupRepository.findMember(groupId, userId);
  if (!member || member.role !== 'owner') {
    throw new AppError('Only the group owner can delete a group', 403, 'FORBIDDEN');
  }
  groupRepository.remove(groupId);
  logger.info('Group deleted', { groupId, userId });
}

export function joinGroup(joinCode: string, userId: number): GroupDetail {
  const group = groupRepository.findByJoinCode(joinCode);
  if (!group) {
    throw new AppError('Invalid join code', 404, 'GROUP_NOT_FOUND');
  }

  const existing = groupRepository.findMember(group.id, userId);
  if (existing) {
    throw new AppError('Already a member of this group', 409, 'ALREADY_MEMBER');
  }

  const memberCount = groupRepository.getMemberCount(group.id);
  if (memberCount >= group.max_members) {
    throw new AppError('Group is full', 409, 'GROUP_FULL');
  }

  groupRepository.addMember(group.id, userId, 'member');
  logger.info('User joined group', { groupId: group.id, userId });

  return getGroupDetail(group.id)!;
}

export function removeMember(groupId: number, requesterId: number, targetUserId: number): void {
  if (requesterId === targetUserId) {
    // Leaving the group
    const member = groupRepository.findMember(groupId, requesterId);
    if (!member) {
      throw new AppError('Not a member of this group', 404, 'NOT_MEMBER');
    }
    if (member.role === 'owner') {
      throw new AppError('Owner cannot leave the group. Transfer ownership or delete the group.', 400, 'OWNER_CANNOT_LEAVE');
    }
    groupRepository.removeMember(groupId, targetUserId);
    logger.info('User left group', { groupId, userId: targetUserId });
    return;
  }

  assertGroupAdmin(groupId, requesterId);

  const target = groupRepository.findMember(groupId, targetUserId);
  if (!target) {
    throw new AppError('User is not a member of this group', 404, 'NOT_MEMBER');
  }
  if (target.role === 'owner') {
    throw new AppError('Cannot remove the group owner', 403, 'CANNOT_REMOVE_OWNER');
  }

  groupRepository.removeMember(groupId, targetUserId);
  logger.info('Member removed from group', { groupId, requesterId, targetUserId });
}

export function updateMemberRole(groupId: number, requesterId: number, targetUserId: number, role: 'admin' | 'member'): void {
  const requester = groupRepository.findMember(groupId, requesterId);
  if (!requester || requester.role !== 'owner') {
    throw new AppError('Only the owner can change member roles', 403, 'FORBIDDEN');
  }

  const target = groupRepository.findMember(groupId, targetUserId);
  if (!target) {
    throw new AppError('User is not a member of this group', 404, 'NOT_MEMBER');
  }
  if (target.role === 'owner') {
    throw new AppError('Cannot change the owner role', 403, 'CANNOT_CHANGE_OWNER');
  }

  groupRepository.updateMemberRole(groupId, targetUserId, role);
  logger.info('Member role updated', { groupId, targetUserId, role });
}

export function assignWordlist(groupId: number, userId: number, wordlistId: number): void {
  assertGroupAdmin(groupId, userId);

  const wl = wordlistRepository.findById(wordlistId);
  if (!wl) {
    throw new AppError('Wordlist not found', 404, 'WORDLIST_NOT_FOUND');
  }

  try {
    groupRepository.assignWordlist(groupId, wordlistId);
    logger.info('Wordlist assigned to group', { groupId, wordlistId });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint')) {
      throw new AppError('Wordlist already assigned to this group', 409, 'ALREADY_ASSIGNED');
    }
    throw err;
  }
}

export function unassignWordlist(groupId: number, userId: number, wordlistId: number): void {
  assertGroupAdmin(groupId, userId);
  groupRepository.unassignWordlist(groupId, wordlistId);
  logger.info('Wordlist unassigned from group', { groupId, wordlistId });
}

function assertGroupAdmin(groupId: number, userId: number): void {
  const member = groupRepository.findMember(groupId, userId);
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    throw new AppError('You must be a group owner or admin', 403, 'FORBIDDEN');
  }
}

export function canAccessGroup(groupId: number, userId: number, userRole: string): boolean {
  if (userRole === 'admin') return true;
  const member = groupRepository.findMember(groupId, userId);
  return !!member;
}
