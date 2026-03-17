import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { validate, createGroupSchema, updateGroupSchema, joinGroupSchema, assignWordlistSchema, updateMemberRoleSchema } from '../middleware/validate.js';
import * as groupService from '../services/groupService.js';
import type { AuthRequest } from '../types/index.js';

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/groups
 * List groups the current user belongs to.
 * Parents/admins also see groups they created.
 */
router.get('/', (req, res) => {
  const { userId, role } = (req as AuthRequest).user!;

  if (role === 'admin') {
    // Admins see all groups they created + groups they're members of
    const created = groupService.getGroupsCreatedBy(userId);
    const member = groupService.getGroupsForUser(userId);
    const seen = new Set(created.map(g => g.id));
    const merged = [...created, ...member.filter(g => !seen.has(g.id))];
    res.json({ groups: merged });
    return;
  }

  if (role === 'parent') {
    const created = groupService.getGroupsCreatedBy(userId);
    const member = groupService.getGroupsForUser(userId);
    const seen = new Set(created.map(g => g.id));
    const merged = [...created, ...member.filter(g => !seen.has(g.id))];
    res.json({ groups: merged });
    return;
  }

  // Students see groups they belong to
  const groups = groupService.getGroupsForUser(userId);
  res.json({ groups });
});

/**
 * POST /api/groups
 * Create a new group. Parents and admins only.
 */
router.post('/', requireRole(['parent', 'admin']), validate(createGroupSchema), (req, res) => {
  const { userId } = (req as AuthRequest).user!;
  const { name, description, maxMembers } = req.body;
  const group = groupService.createGroup(name, description || '', userId, maxMembers);
  res.status(201).json(group);
});

/**
 * GET /api/groups/:id
 * Get group detail. Must be a member or admin.
 */
router.get('/:id', (req, res) => {
  const { userId, role } = (req as AuthRequest).user!;
  const groupId = parseInt(req.params.id as string, 10);

  if (!groupService.canAccessGroup(groupId, userId, role)) {
    res.status(403).json({ error: 'Forbidden', message: 'Not a member of this group' });
    return;
  }

  const detail = groupService.getGroupDetail(groupId);
  if (!detail) {
    res.status(404).json({ error: 'Not Found', message: 'Group not found' });
    return;
  }

  res.json(detail);
});

/**
 * PATCH /api/groups/:id
 * Update group name/description. Owner or admin only.
 */
router.patch('/:id', validate(updateGroupSchema), (req, res) => {
  const { userId } = (req as AuthRequest).user!;
  const groupId = parseInt(req.params.id as string, 10);
  const updated = groupService.updateGroup(groupId, userId, req.body);
  res.json(updated);
});

/**
 * DELETE /api/groups/:id
 * Delete a group. Owner only.
 */
router.delete('/:id', (req, res) => {
  const { userId } = (req as AuthRequest).user!;
  const groupId = parseInt(req.params.id as string, 10);
  groupService.deleteGroup(groupId, userId);
  res.json({ message: 'Group deleted' });
});

/**
 * POST /api/groups/join
 * Join a group by code. Any authenticated user.
 */
router.post('/join', validate(joinGroupSchema), (req, res) => {
  const { userId } = (req as AuthRequest).user!;
  const { joinCode } = req.body;
  const group = groupService.joinGroup(joinCode, userId);
  res.json(group);
});

/**
 * DELETE /api/groups/:id/members/:userId
 * Remove a member (or leave if removing self). Admin/owner for others, any member for self.
 */
router.delete('/:id/members/:userId', (req, res) => {
  const requester = (req as AuthRequest).user!;
  const groupId = parseInt(req.params.id as string, 10);
  const targetUserId = parseInt(req.params.userId as string, 10);
  groupService.removeMember(groupId, requester.userId, targetUserId);
  res.json({ message: 'Member removed' });
});

/**
 * PATCH /api/groups/:id/members/:userId/role
 * Change a member's role. Owner only.
 */
router.patch('/:id/members/:userId/role', validate(updateMemberRoleSchema), (req, res) => {
  const requester = (req as AuthRequest).user!;
  const groupId = parseInt(req.params.id as string, 10);
  const targetUserId = parseInt(req.params.userId as string, 10);
  const { role } = req.body;
  groupService.updateMemberRole(groupId, requester.userId, targetUserId, role);
  res.json({ message: 'Role updated' });
});

/**
 * POST /api/groups/:id/wordlists
 * Assign a wordlist to the group. Owner/admin only.
 */
router.post('/:id/wordlists', validate(assignWordlistSchema), (req, res) => {
  const { userId } = (req as AuthRequest).user!;
  const groupId = parseInt(req.params.id as string, 10);
  const { wordlistId } = req.body;
  groupService.assignWordlist(groupId, userId, wordlistId);
  res.json({ message: 'Wordlist assigned' });
});

/**
 * DELETE /api/groups/:id/wordlists/:wordlistId
 * Unassign a wordlist from the group. Owner/admin only.
 */
router.delete('/:id/wordlists/:wordlistId', (req, res) => {
  const { userId } = (req as AuthRequest).user!;
  const groupId = parseInt(req.params.id as string, 10);
  const wordlistId = parseInt(req.params.wordlistId as string, 10);
  groupService.unassignWordlist(groupId, userId, wordlistId);
  res.json({ message: 'Wordlist unassigned' });
});

export default router;
