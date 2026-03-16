import type { Request, Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/index.js';

interface CacheEntry {
  data: unknown;
  timestamp: number;
  ttl: number;
}

class ResponseCache {
  private cache = new Map<string, CacheEntry>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(cleanupIntervalMs = 60_000) {
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
  }

  private buildKey(req: Request): string {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId || 'anon';
    const queryHash = JSON.stringify(req.query);
    return `${req.path}:${userId}:${queryHash}`;
  }

  get(key: string): unknown | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.data;
  }

  set(key: string, data: unknown, ttl: number): void {
    this.cache.set(key, { data, timestamp: Date.now(), ttl });
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  invalidateForUser(userId: number): void {
    this.invalidate(`:${userId}:`);
  }

  clear(): void {
    this.cache.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  get size(): number {
    return this.cache.size;
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

export const responseCache = new ResponseCache();

export function cacheMiddleware(ttlMs = 60_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId || 'anon';
    const queryHash = JSON.stringify(req.query);
    const key = `${req.path}:${userId}:${queryHash}`;

    const cached = responseCache.get(key);
    if (cached) {
      res.json(cached);
      return;
    }

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        responseCache.set(key, body, ttlMs);
      }
      return originalJson(body);
    };

    next();
  };
}
