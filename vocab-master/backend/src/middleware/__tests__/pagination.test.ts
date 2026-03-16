import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { pagination, buildPaginatedResponse } from '../pagination'

function createMockReq(query: Record<string, string> = {}): Partial<Request> {
  return { query }
}

function createMockRes(): Partial<Response> {
  return {}
}

describe('pagination middleware', () => {
  const next: NextFunction = vi.fn()

  it('sets defaults when no query params provided', () => {
    const req = createMockReq() as Request
    const res = createMockRes() as Response
    const middleware = pagination()

    middleware(req, res, next)

    expect(req.pagination).toEqual({
      page: 1,
      limit: 50,
      offset: 0,
      sortBy: 'created_at',
      sortOrder: 'desc'
    })
  })

  it('parses custom page and limit from query', () => {
    const req = createMockReq({ page: '3', limit: '25' }) as Request
    const res = createMockRes() as Response
    const middleware = pagination()

    middleware(req, res, next)

    expect(req.pagination?.page).toBe(3)
    expect(req.pagination?.limit).toBe(25)
  })

  it('clamps page to minimum 1 when page is 0', () => {
    const req = createMockReq({ page: '0' }) as Request
    const res = createMockRes() as Response
    const middleware = pagination()

    middleware(req, res, next)

    expect(req.pagination?.page).toBe(1)
  })

  it('clamps page to minimum 1 when page is negative', () => {
    const req = createMockReq({ page: '-5' }) as Request
    const res = createMockRes() as Response
    const middleware = pagination()

    middleware(req, res, next)

    expect(req.pagination?.page).toBe(1)
  })

  it('clamps limit to maxLimit when limit exceeds it', () => {
    const req = createMockReq({ limit: '999' }) as Request
    const res = createMockRes() as Response
    const middleware = pagination()

    middleware(req, res, next)

    expect(req.pagination?.limit).toBe(100)
  })

  it('falls back to defaultLimit when limit is 0 (falsy parseInt)', () => {
    const req = createMockReq({ limit: '0' }) as Request
    const res = createMockRes() as Response
    const middleware = pagination()

    middleware(req, res, next)

    // parseInt('0') is 0 which is falsy, so || defaultLimit kicks in
    expect(req.pagination?.limit).toBe(50)
  })

  it('clamps negative limit to minimum 1', () => {
    const req = createMockReq({ limit: '-5' }) as Request
    const res = createMockRes() as Response
    const middleware = pagination()

    middleware(req, res, next)

    expect(req.pagination?.limit).toBe(1)
  })

  it('uses custom defaultLimit when no query limit provided', () => {
    const req = createMockReq() as Request
    const res = createMockRes() as Response
    const middleware = pagination({ defaultLimit: 20 })

    middleware(req, res, next)

    expect(req.pagination?.limit).toBe(20)
  })

  it('caps limit at custom maxLimit', () => {
    const req = createMockReq({ limit: '50' }) as Request
    const res = createMockRes() as Response
    const middleware = pagination({ maxLimit: 10 })

    middleware(req, res, next)

    expect(req.pagination?.limit).toBe(10)
  })

  it('accepts sortOrder asc', () => {
    const req = createMockReq({ sortOrder: 'asc' }) as Request
    const res = createMockRes() as Response
    const middleware = pagination()

    middleware(req, res, next)

    expect(req.pagination?.sortOrder).toBe('asc')
  })

  it('defaults sortOrder to desc for invalid values', () => {
    const req = createMockReq({ sortOrder: 'random' }) as Request
    const res = createMockRes() as Response
    const middleware = pagination()

    middleware(req, res, next)

    expect(req.pagination?.sortOrder).toBe('desc')
  })

  it('falls back to defaultSortBy for unknown sortBy fields', () => {
    const req = createMockReq({ sortBy: 'unknown_field' }) as Request
    const res = createMockRes() as Response
    const middleware = pagination()

    middleware(req, res, next)

    expect(req.pagination?.sortBy).toBe('created_at')
  })

  it('restricts sortBy to custom allowedSortFields', () => {
    const req = createMockReq({ sortBy: 'created_at' }) as Request
    const res = createMockRes() as Response
    const middleware = pagination({
      allowedSortFields: ['name', 'date'],
      defaultSortBy: 'name'
    })

    middleware(req, res, next)

    expect(req.pagination?.sortBy).toBe('name')
  })

  it('allows sortBy when field is in allowedSortFields', () => {
    const req = createMockReq({ sortBy: 'date' }) as Request
    const res = createMockRes() as Response
    const middleware = pagination({
      allowedSortFields: ['name', 'date'],
      defaultSortBy: 'name'
    })

    middleware(req, res, next)

    expect(req.pagination?.sortBy).toBe('date')
  })

  it('calculates offset correctly', () => {
    const req = createMockReq({ page: '3', limit: '10' }) as Request
    const res = createMockRes() as Response
    const middleware = pagination()

    middleware(req, res, next)

    expect(req.pagination?.offset).toBe(20)
  })

  it('calls next()', () => {
    const req = createMockReq() as Request
    const res = createMockRes() as Response
    const nextFn = vi.fn()
    const middleware = pagination()

    middleware(req, res, nextFn)

    expect(nextFn).toHaveBeenCalledOnce()
  })
})

describe('buildPaginatedResponse', () => {
  it('builds correct response envelope', () => {
    const data = [{ id: 1 }, { id: 2 }]
    const params = { page: 1, limit: 10, offset: 0, sortBy: 'created_at' as const, sortOrder: 'desc' as const }

    const result = buildPaginatedResponse(data, 2, params)

    expect(result).toEqual({
      data: [{ id: 1 }, { id: 2 }],
      meta: {
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      }
    })
  })

  it('calculates totalPages correctly for non-even divisions', () => {
    const data = Array.from({ length: 10 }, (_, i) => ({ id: i }))
    const params = { page: 1, limit: 10, offset: 0, sortBy: 'created_at' as const, sortOrder: 'desc' as const }

    const result = buildPaginatedResponse(data, 25, params)

    expect(result.meta.totalPages).toBe(3)
  })

  it('handles empty data with total 0', () => {
    const params = { page: 1, limit: 10, offset: 0, sortBy: 'created_at' as const, sortOrder: 'desc' as const }

    const result = buildPaginatedResponse([], 0, params)

    expect(result).toEqual({
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      }
    })
  })
})
