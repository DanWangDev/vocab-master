import { Response, NextFunction } from 'express';
import { authService } from '../services/authService.js';
import { db } from '../config/database.js';
import type { AuthRequest } from '../types/index.js';

// Throttle cache: userId -> last update timestamp (ms)
const lastSeenCache = new Map<number, number>();
const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

function updateLastSeen(userId: number): void {
  const now = Date.now();
  const lastUpdate = lastSeenCache.get(userId);

  if (lastUpdate && now - lastUpdate < LAST_SEEN_THROTTLE_MS) {
    return;
  }

  lastSeenCache.set(userId, now);

  try {
    db.prepare('UPDATE users SET last_seen_at = datetime(\'now\') WHERE id = ?').run(userId);
  } catch {
    // Fire-and-forget: don't block the request on failure
  }
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header'
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = authService.verifyAccessToken(token);
    req.user = payload;
    updateLastSeen(payload.userId);
    next();
  } catch (error) {
    res.status(401).json({
      error: 'Unauthorized',
      message: error instanceof Error ? error.message : 'Invalid token'
    });
  }
}

export function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = authService.verifyAccessToken(token);
    req.user = payload;
  } catch {
    // Token invalid but that's okay for optional auth
  }

  next();
}

/**
 * Middleware to enforce role-based access.
 * Must be used AFTER authMiddleware.
 */
export function requireRole(allowedRoles: ('student' | 'parent' | 'admin')[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden', message: 'Insufficient permissions' });
      return;
    }

    next();
  };
}
