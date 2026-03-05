import { Request, Response, NextFunction } from 'express';

interface BruteForceEntry {
  count: number;
  lastAttempt: number;
  lockedUntil: number;
}

const store = new Map<string, BruteForceEntry>();

const LOCKOUT_TIERS = [
  { threshold: 5, duration: 30 * 1000 },       // 5 failures -> 30s
  { threshold: 10, duration: 5 * 60 * 1000 },  // 10 failures -> 5min
  { threshold: 15, duration: 30 * 60 * 1000 },  // 15 failures -> 30min
];

const CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 minutes
const ENTRY_MAX_AGE = 60 * 60 * 1000;    // 1 hour

function getLockoutDuration(failureCount: number): number {
  let duration = 0;
  for (const tier of LOCKOUT_TIERS) {
    if (failureCount >= tier.threshold) {
      duration = tier.duration;
    }
  }
  return duration;
}

export function checkBruteForce(req: Request, res: Response, next: NextFunction): void {
  const username = req.body?.username;
  if (!username) {
    next();
    return;
  }

  const key = String(username).toLowerCase();
  const entry = store.get(key);

  if (entry && entry.lockedUntil > Date.now()) {
    const retryAfter = Math.ceil((entry.lockedUntil - Date.now()) / 1000);
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Account temporarily locked due to too many failed attempts. Please try again later.',
      retryAfter,
    });
    return;
  }

  next();
}

export function recordFailedLogin(username: string): void {
  const key = username.toLowerCase();
  const now = Date.now();
  const entry = store.get(key) || { count: 0, lastAttempt: 0, lockedUntil: 0 };

  const updated = {
    count: entry.count + 1,
    lastAttempt: now,
    lockedUntil: 0,
  };

  const lockoutDuration = getLockoutDuration(updated.count);
  if (lockoutDuration > 0) {
    updated.lockedUntil = now + lockoutDuration;
  }

  store.set(key, updated);
}

export function recordSuccessfulLogin(username: string): void {
  store.delete(username.toLowerCase());
}

// Cleanup stale entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.lastAttempt > ENTRY_MAX_AGE) {
      store.delete(key);
    }
  }
}, CLEANUP_INTERVAL);
