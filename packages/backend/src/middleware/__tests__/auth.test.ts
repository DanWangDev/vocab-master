import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Response, NextFunction } from 'express'
import type { AuthRequest, JWTPayload } from '../../types/index.js'

vi.mock('../hubAuth.js', () => ({
  verifyAndSyncHubUser: vi.fn()
}))

vi.mock('@danwangdev/auth-client/server', () => ({
  isRevoked: vi.fn().mockReturnValue(false)
}))

vi.mock('../../config/database.js', () => ({
  db: {
    prepare: vi.fn().mockReturnValue({
      run: vi.fn()
    })
  }
}))

import { authMiddleware, optionalAuthMiddleware, requireRole } from '../auth.js'
import { verifyAndSyncHubUser } from '../hubAuth.js'
import { isRevoked } from '@danwangdev/auth-client/server'

const mockVerify = vi.mocked(verifyAndSyncHubUser)
const mockIsRevoked = vi.mocked(isRevoked)

function createMockReq(headers: Record<string, string> = {}): Partial<AuthRequest> {
  return { headers, user: undefined } as unknown as Partial<AuthRequest>
}

function createMockRes(): { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } {
  const res: Record<string, ReturnType<typeof vi.fn>> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json = vi.fn().mockReturnValue(res)
  return res as { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> }
}

const validPayload: JWTPayload = {
  userId: 1,
  username: 'testuser',
  role: 'student',
  hubUserId: 'hub-123'
}

describe('authMiddleware', () => {
  let next: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    next = vi.fn()
    mockIsRevoked.mockReturnValue(false)
  })

  it('returns 401 when no authorization header is present', () => {
    const req = createMockReq()
    const res = createMockRes()

    authMiddleware(req as AuthRequest, res as unknown as Response, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header'
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when authorization header does not start with Bearer', () => {
    const req = createMockReq({ authorization: 'Basic abc123' })
    const res = createMockRes()

    authMiddleware(req as AuthRequest, res as unknown as Response, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header'
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('sets req.user and calls next() for a valid token', async () => {
    mockVerify.mockResolvedValue(validPayload)
    const req = createMockReq({ authorization: 'Bearer valid-token' })
    const res = createMockRes()

    authMiddleware(req as AuthRequest, res as unknown as Response, next)
    await vi.waitFor(() => expect(next).toHaveBeenCalled())

    expect(mockVerify).toHaveBeenCalledWith('valid-token')
    expect((req as AuthRequest).user).toEqual(validPayload)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 401 when verifyAndSyncHubUser throws', async () => {
    mockVerify.mockRejectedValue(new Error('Token expired'))
    const req = createMockReq({ authorization: 'Bearer bad-token' })
    const res = createMockRes()

    authMiddleware(req as AuthRequest, res as unknown as Response, next)
    await vi.waitFor(() => expect(res.status).toHaveBeenCalled())

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'Token expired'
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 with revoked message when session is revoked', async () => {
    mockVerify.mockResolvedValue(validPayload)
    mockIsRevoked.mockReturnValue(true)
    const req = createMockReq({ authorization: 'Bearer revoked-token' })
    const res = createMockRes()

    authMiddleware(req as AuthRequest, res as unknown as Response, next)
    await vi.waitFor(() => expect(res.status).toHaveBeenCalled())

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'Session revoked via back-channel logout'
    })
    expect(next).not.toHaveBeenCalled()
  })
})

describe('optionalAuthMiddleware', () => {
  let next: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    next = vi.fn()
    mockIsRevoked.mockReturnValue(false)
  })

  it('calls next() without setting req.user when no authorization header', () => {
    const req = createMockReq()
    const res = createMockRes()

    optionalAuthMiddleware(req as AuthRequest, res as unknown as Response, next)

    expect(next).toHaveBeenCalled()
    expect((req as AuthRequest).user).toBeUndefined()
  })

  it('sets req.user and calls next() for a valid token', async () => {
    mockVerify.mockResolvedValue(validPayload)
    const req = createMockReq({ authorization: 'Bearer valid-token' })
    const res = createMockRes()

    optionalAuthMiddleware(req as AuthRequest, res as unknown as Response, next)
    await vi.waitFor(() => expect(next).toHaveBeenCalled())

    expect((req as AuthRequest).user).toEqual(validPayload)
  })

  it('calls next() without setting req.user when token is invalid', async () => {
    mockVerify.mockRejectedValue(new Error('Invalid token'))
    const req = createMockReq({ authorization: 'Bearer bad-token' })
    const res = createMockRes()

    optionalAuthMiddleware(req as AuthRequest, res as unknown as Response, next)
    await vi.waitFor(() => expect(next).toHaveBeenCalled())

    expect((req as AuthRequest).user).toBeUndefined()
    expect(res.status).not.toHaveBeenCalled()
  })
})

describe('requireRole', () => {
  let next: ReturnType<typeof vi.fn>

  beforeEach(() => {
    next = vi.fn()
  })

  it('returns 401 when req.user is not set', () => {
    const middleware = requireRole(['admin'])
    const req = createMockReq()
    const res = createMockRes()

    middleware(req as AuthRequest, res as unknown as Response, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'User not authenticated'
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next() when user has an allowed role', () => {
    const middleware = requireRole(['admin'])
    const req = createMockReq()
    ;(req as AuthRequest).user = { ...validPayload, role: 'admin' }
    const res = createMockRes()

    middleware(req as AuthRequest, res as unknown as Response, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 403 when user role is not in allowed list', () => {
    const middleware = requireRole(['admin'])
    const req = createMockReq()
    ;(req as AuthRequest).user = { ...validPayload, role: 'student' }
    const res = createMockRes()

    middleware(req as AuthRequest, res as unknown as Response, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: 'Insufficient permissions'
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('allows any of multiple specified roles', () => {
    const middleware = requireRole(['student', 'admin'])
    const req = createMockReq()
    ;(req as AuthRequest).user = { ...validPayload, role: 'student' }
    const res = createMockRes()

    middleware(req as AuthRequest, res as unknown as Response, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })
})
