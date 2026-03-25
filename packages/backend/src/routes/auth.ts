import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import {
  validate,
  createStudentByParentSchema,
  updateProfileSchema
} from '../middleware/validate.js';
import { userRepository } from '../repositories/userRepository.js';
import { authService } from '../services/authService.js';
import { env } from '../config/env.js';
import { logger } from '../services/logger.js';
import type {
  AuthRequest,
  CreateStudentByParentRequest,
  UpdateProfileRequest
} from '../types/index.js';

const router = Router();

/**
 * POST /api/auth/oidc/token — BFF token exchange.
 * Proxies token requests to the hub, injecting the client_secret.
 * Supports both authorization_code and refresh_token grants.
 */
router.post('/oidc/token', async (req: Request, res: Response) => {
  try {
    const { grant_type, code, redirect_uri, code_verifier, refresh_token } = req.body;

    if (!grant_type) {
      res.status(400).json({ error: 'invalid_request', error_description: 'grant_type is required' });
      return;
    }

    const tokenUrl = `${env.OIDC_INTERNAL_ISSUER}/oidc/token`;
    const body: Record<string, string> = {
      grant_type,
      client_id: env.OIDC_CLIENT_ID,
      client_secret: env.OIDC_CLIENT_SECRET,
    };

    if (grant_type === 'authorization_code') {
      if (!code || !redirect_uri || !code_verifier) {
        res.status(400).json({ error: 'invalid_request', error_description: 'code, redirect_uri, and code_verifier are required' });
        return;
      }
      body.code = code;
      body.redirect_uri = redirect_uri;
      body.code_verifier = code_verifier;
    } else if (grant_type === 'refresh_token') {
      if (!refresh_token) {
        res.status(400).json({ error: 'invalid_request', error_description: 'refresh_token is required' });
        return;
      }
      body.refresh_token = refresh_token;
    } else {
      res.status(400).json({ error: 'unsupported_grant_type', error_description: 'Only authorization_code and refresh_token grants are supported' });
      return;
    }

    const hubResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
    });

    const data = await hubResponse.json() as Record<string, unknown>;

    if (!hubResponse.ok) {
      logger.error('Hub token exchange failed', { status: hubResponse.status, error: data.error });
      res.status(hubResponse.status).json(data);
      return;
    }

    res.json(data);
  } catch (error) {
    logger.error('BFF token exchange error', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'server_error', error_description: 'Token exchange failed' });
  }
});

// POST /api/auth/create-student - Parent creates a student account (auto-linked)
router.post('/create-student', authMiddleware, requireRole(['parent']), validate(createStudentByParentSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, displayName } = req.body as CreateStudentByParentRequest;
    const result = await authService.createStudentForParent(req.user!.userId, username, password, displayName);

    res.status(201).json({
      success: true,
      user: result.user
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create student';

    if (message === 'Username already taken') {
      res.status(409).json({ error: 'Conflict', message });
    } else if (message === 'Only parents can create student accounts') {
      res.status(403).json({ error: 'Forbidden', message });
    } else {
      res.status(400).json({ error: 'Bad Request', message });
    }
  }
});

// POST /api/auth/logout
router.post('/logout', (_req: AuthRequest, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

// PATCH /api/auth/profile - Self-service profile update
router.patch('/profile', authMiddleware, validate(updateProfileSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { username, displayName } = req.body as UpdateProfileRequest;
    const user = authService.updateProfile(req.user!.userId, { username, displayName });

    res.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Profile update failed';

    if (message === 'Username already taken') {
      res.status(409).json({ error: 'Conflict', message });
    } else if (message === 'User not found') {
      res.status(404).json({ error: 'Not Found', message });
    } else {
      res.status(400).json({ error: 'Bad Request', message });
    }
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const userRow = userRepository.findById(req.user!.userId);

    if (!userRow) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
      return;
    }

    res.json({
      user: {
        id: userRow.id,
        username: userRow.username,
        displayName: userRow.display_name,
        role: userRow.role,
        email: userRow.email,
        emailVerified: userRow.email_verified === 1,
        authProvider: userRow.auth_provider || 'local',
        createdAt: userRow.created_at
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get user'
    });
  }
});

export default router;
