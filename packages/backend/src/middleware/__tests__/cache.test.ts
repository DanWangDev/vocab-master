import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { responseCache, cacheMiddleware } from '../cache'

function createMockReq(options: {
  method?: string
  path?: string
  query?: Record<string, string>
  user?: { userId: number }
} = {}): Partial<Request> {
  return {
    method: options.method ?? 'GET',
    path: options.path ?? '/test',
    query: options.query ?? {},
    user: options.user
  } as Partial<Request>
}

function createMockRes(): { json: ReturnType<typeof vi.fn>; statusCode: number } {
  return {
    json: vi.fn().mockReturnThis(),
    statusCode: 200
  }
}

describe('ResponseCache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    responseCache.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('stores and retrieves data', () => {
    responseCache.set('key1', { value: 'hello' }, 5000)

    const result = responseCache.get('key1')

    expect(result).toEqual({ value: 'hello' })
  })

  it('returns undefined for missing key', () => {
    const result = responseCache.get('nonexistent')

    expect(result).toBeUndefined()
  })

  it('expires entries after TTL', () => {
    responseCache.set('expiring', { value: 'temp' }, 1000)

    expect(responseCache.get('expiring')).toEqual({ value: 'temp' })

    vi.advanceTimersByTime(1001)

    expect(responseCache.get('expiring')).toBeUndefined()
  })

  it('invalidates keys matching a pattern', () => {
    responseCache.set('/api/users:1:{}', { users: [] }, 5000)
    responseCache.set('/api/users:2:{}', { users: [] }, 5000)
    responseCache.set('/api/posts:1:{}', { posts: [] }, 5000)

    responseCache.invalidate('/api/users')

    expect(responseCache.get('/api/users:1:{}')).toBeUndefined()
    expect(responseCache.get('/api/users:2:{}')).toBeUndefined()
    expect(responseCache.get('/api/posts:1:{}')).toBeDefined()
  })

  it('invalidates all keys for a specific user', () => {
    responseCache.set('/api/data:42:{}', { data: 'a' }, 5000)
    responseCache.set('/api/other:42:{"q":"1"}', { data: 'b' }, 5000)
    responseCache.set('/api/data:99:{}', { data: 'c' }, 5000)

    responseCache.invalidateForUser(42)

    expect(responseCache.get('/api/data:42:{}')).toBeUndefined()
    expect(responseCache.get('/api/other:42:{"q":"1"}')).toBeUndefined()
    expect(responseCache.get('/api/data:99:{}')).toBeDefined()
  })

  it('clears all entries', () => {
    responseCache.set('a', 1, 5000)
    responseCache.set('b', 2, 5000)

    responseCache.clear()

    expect(responseCache.size).toBe(0)
  })

  it('returns correct size', () => {
    expect(responseCache.size).toBe(0)

    responseCache.set('a', 1, 5000)
    responseCache.set('b', 2, 5000)

    expect(responseCache.size).toBe(2)
  })

  it('cleanup removes expired entries automatically', () => {
    responseCache.set('short', 'data1', 1000)
    responseCache.set('long', 'data2', 120_000)

    expect(responseCache.size).toBe(2)

    // Advance past the short TTL and trigger cleanup interval (60s default)
    vi.advanceTimersByTime(61_000)

    expect(responseCache.get('short')).toBeUndefined()
    expect(responseCache.get('long')).toBeDefined()
  })

  it('destroy clears interval and cache', () => {
    // Create a separate cache to test destroy without affecting singleton
    // Since we can't instantiate ResponseCache directly, we test destroy on the singleton
    // but note: this will stop the singleton's cleanup interval
    responseCache.set('item', 'value', 5000)
    expect(responseCache.size).toBe(1)

    responseCache.destroy()

    expect(responseCache.size).toBe(0)
  })
})

describe('cacheMiddleware', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    responseCache.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('skips non-GET requests', () => {
    const req = createMockReq({ method: 'POST' }) as Request
    const res = createMockRes() as unknown as Response
    const next = vi.fn()
    const middleware = cacheMiddleware(5000)

    middleware(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(responseCache.size).toBe(0)
  })

  it('caches GET response and returns cached on second call', () => {
    const middleware = cacheMiddleware(5000)
    const req = createMockReq({ path: '/api/data', user: { userId: 1 } }) as Request
    const res = createMockRes()
    const next = vi.fn()

    // First request - passes through
    middleware(req, res as unknown as Response, next)
    expect(next).toHaveBeenCalledOnce()

    // Simulate route handler calling res.json
    res.json({ items: [1, 2, 3] })

    // Second request - should return cached
    const req2 = createMockReq({ path: '/api/data', user: { userId: 1 } }) as Request
    const res2 = createMockRes()
    const next2 = vi.fn()

    middleware(req2, res2 as unknown as Response, next2)

    expect(next2).not.toHaveBeenCalled()
    expect(res2.json).toHaveBeenCalledWith({ items: [1, 2, 3] })
  })

  it('uses different cache entries for different users', () => {
    const middleware = cacheMiddleware(5000)

    // User 1 request
    const req1 = createMockReq({ path: '/api/data', user: { userId: 1 } }) as Request
    const res1 = createMockRes()
    const next1 = vi.fn()
    middleware(req1, res1 as unknown as Response, next1)
    res1.json({ data: 'user1' })

    // User 2 request - should NOT get user 1's cached data
    const req2 = createMockReq({ path: '/api/data', user: { userId: 2 } }) as Request
    const res2 = createMockRes()
    const next2 = vi.fn()
    middleware(req2, res2 as unknown as Response, next2)

    expect(next2).toHaveBeenCalledOnce()
  })

  it('uses different cache entries for different query params', () => {
    const middleware = cacheMiddleware(5000)

    // First query
    const req1 = createMockReq({ path: '/api/data', query: { page: '1' }, user: { userId: 1 } }) as Request
    const res1 = createMockRes()
    const next1 = vi.fn()
    middleware(req1, res1 as unknown as Response, next1)
    res1.json({ page: 1 })

    // Different query - should NOT get cached data
    const req2 = createMockReq({ path: '/api/data', query: { page: '2' }, user: { userId: 1 } }) as Request
    const res2 = createMockRes()
    const next2 = vi.fn()
    middleware(req2, res2 as unknown as Response, next2)

    expect(next2).toHaveBeenCalledOnce()
  })

  it('does not cache error responses', () => {
    const middleware = cacheMiddleware(5000)

    const req = createMockReq({ path: '/api/fail', user: { userId: 1 } }) as Request
    const res = createMockRes()
    res.statusCode = 404
    const next = vi.fn()

    middleware(req, res as unknown as Response, next)
    res.json({ error: 'not found' })

    // Second request should pass through since error was not cached
    const req2 = createMockReq({ path: '/api/fail', user: { userId: 1 } }) as Request
    const res2 = createMockRes()
    const next2 = vi.fn()
    middleware(req2, res2 as unknown as Response, next2)

    expect(next2).toHaveBeenCalledOnce()
  })

  it('uses anon key for requests without a user', () => {
    const middleware = cacheMiddleware(5000)

    const req = createMockReq({ path: '/api/public' }) as Request
    const res = createMockRes()
    const next = vi.fn()

    middleware(req, res as unknown as Response, next)
    res.json({ public: true })

    // Second anonymous request should hit cache
    const req2 = createMockReq({ path: '/api/public' }) as Request
    const res2 = createMockRes()
    const next2 = vi.fn()

    middleware(req2, res2 as unknown as Response, next2)

    expect(next2).not.toHaveBeenCalled()
    expect(res2.json).toHaveBeenCalledWith({ public: true })
  })
})
