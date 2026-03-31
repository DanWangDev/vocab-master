import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@danwangdev/auth-client/server', () => ({
  discoverOidc: vi.fn(),
  verifyIdToken: vi.fn(),
  unrevokeSubject: vi.fn(),
}))

vi.mock('../../services/hubUserSync.js', () => ({
  syncHubUser: vi.fn(),
}))

vi.mock('../../config/env.js', () => ({
  env: {
    OIDC_ISSUER: 'https://hub.test.example',
    OIDC_INTERNAL_ISSUER: 'http://hub-internal:3009',
    OIDC_CLIENT_ID: 'test-client-id',
  },
}))

import { getJwksUri, verifyHubToken, verifyAndSyncHubUser, clearHubAuthCache } from '../hubAuth.js'
import { discoverOidc, verifyIdToken, unrevokeSubject } from '@danwangdev/auth-client/server'
import { syncHubUser } from '../../services/hubUserSync.js'

const mockDiscoverOidc = vi.mocked(discoverOidc)
const mockVerifyIdToken = vi.mocked(verifyIdToken)
const mockUnrevokeSubject = vi.mocked(unrevokeSubject)
const mockSyncHubUser = vi.mocked(syncHubUser)

const fakeOidcMetadata = {
  jwks_uri: 'http://hub-internal:3009/.well-known/jwks.json',
  authorization_endpoint: 'https://hub.test.example/authorize',
  token_endpoint: 'http://hub-internal:3009/token',
  issuer: 'https://hub.test.example',
}

const fakeVerifiedUser = {
  sub: 'hub-user-abc-123',
  email: 'alice@example.com',
  username: 'alice',
  display_name: 'Alice Smith',
  role: 'user',
  plan: 'pro',
  features: ['vocab', 'quiz'],
  apps: ['vocab-master'],
  expires_at: '2026-12-31T00:00:00Z',
}

const fakeLocalUser = {
  id: 42,
  username: 'alice',
  role: 'student' as const,
  display_name: 'Alice Smith',
  email: 'alice@example.com',
  hub_user_id: 'hub-user-abc-123',
}

describe('getJwksUri', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearHubAuthCache()
  })

  it('calls discoverOidc with correct issuer args and returns jwks_uri', async () => {
    mockDiscoverOidc.mockResolvedValue(fakeOidcMetadata as never)

    const result = await getJwksUri()

    expect(mockDiscoverOidc).toHaveBeenCalledWith(
      'https://hub.test.example',
      'http://hub-internal:3009'
    )
    expect(result).toBe('http://hub-internal:3009/.well-known/jwks.json')
  })

  it('caches result and does not call discoverOidc on second invocation', async () => {
    mockDiscoverOidc.mockResolvedValue(fakeOidcMetadata as never)

    const first = await getJwksUri()
    const second = await getJwksUri()

    expect(mockDiscoverOidc).toHaveBeenCalledTimes(1)
    expect(first).toBe(second)
  })

  it('calls discoverOidc again after clearHubAuthCache()', async () => {
    mockDiscoverOidc.mockResolvedValue(fakeOidcMetadata as never)

    await getJwksUri()
    expect(mockDiscoverOidc).toHaveBeenCalledTimes(1)

    clearHubAuthCache()

    const updatedMetadata = {
      ...fakeOidcMetadata,
      jwks_uri: 'http://hub-internal:3009/.well-known/jwks-v2.json',
    }
    mockDiscoverOidc.mockResolvedValue(updatedMetadata as never)

    const result = await getJwksUri()

    expect(mockDiscoverOidc).toHaveBeenCalledTimes(2)
    expect(result).toBe('http://hub-internal:3009/.well-known/jwks-v2.json')
  })
})

describe('verifyHubToken', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearHubAuthCache()
    mockDiscoverOidc.mockResolvedValue(fakeOidcMetadata as never)
  })

  it('calls verifyIdToken with correct args', async () => {
    mockVerifyIdToken.mockResolvedValue(fakeVerifiedUser as never)

    await verifyHubToken('test-id-token')

    expect(mockVerifyIdToken).toHaveBeenCalledWith(
      'test-id-token',
      'http://hub-internal:3009/.well-known/jwks.json',
      'https://hub.test.example',
      'test-client-id'
    )
  })

  it('maps returned user to HubTokenClaims shape correctly', async () => {
    mockVerifyIdToken.mockResolvedValue(fakeVerifiedUser as never)

    const claims = await verifyHubToken('test-id-token')

    expect(claims).toEqual({
      sub: 'hub-user-abc-123',
      email: 'alice@example.com',
      username: 'alice',
      displayName: 'Alice Smith',
      role: 'user',
      plan: 'pro',
      features: ['vocab', 'quiz'],
      apps: ['vocab-master'],
      expiresAt: '2026-12-31T00:00:00Z',
      iat: 0,
      exp: 0,
    })
  })

  it('creates new arrays for features and apps (no shared references)', async () => {
    mockVerifyIdToken.mockResolvedValue(fakeVerifiedUser as never)

    const claims = await verifyHubToken('test-id-token')

    expect(claims.features).not.toBe(fakeVerifiedUser.features)
    expect(claims.apps).not.toBe(fakeVerifiedUser.apps)
    expect(claims.features).toEqual(fakeVerifiedUser.features)
    expect(claims.apps).toEqual(fakeVerifiedUser.apps)
  })

  it('maps expiresAt to null when expires_at is undefined', async () => {
    const userWithoutExpiry = { ...fakeVerifiedUser, expires_at: undefined }
    mockVerifyIdToken.mockResolvedValue(userWithoutExpiry as never)

    const claims = await verifyHubToken('test-id-token')

    expect(claims.expiresAt).toBeNull()
  })

  it('throws when verifyIdToken rejects', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Token signature invalid'))

    await expect(verifyHubToken('bad-token')).rejects.toThrow('Token signature invalid')
  })
})

describe('verifyAndSyncHubUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearHubAuthCache()
    mockDiscoverOidc.mockResolvedValue(fakeOidcMetadata as never)
    mockVerifyIdToken.mockResolvedValue(fakeVerifiedUser as never)
    mockSyncHubUser.mockReturnValue(fakeLocalUser as never)
  })

  it('verifies token, syncs user, unrevokes subject, and returns JWTPayload', async () => {
    const result = await verifyAndSyncHubUser('valid-token')

    expect(mockVerifyIdToken).toHaveBeenCalledOnce()
    expect(mockSyncHubUser).toHaveBeenCalledOnce()
    expect(mockUnrevokeSubject).toHaveBeenCalledOnce()
    expect(result).toBeDefined()
  })

  it('returns correct JWTPayload shape', async () => {
    const result = await verifyAndSyncHubUser('valid-token')

    expect(result).toEqual({
      userId: 42,
      username: 'alice',
      role: 'student',
      hubUserId: 'hub-user-abc-123',
    })
  })

  it('passes HubTokenClaims to syncHubUser', async () => {
    await verifyAndSyncHubUser('valid-token')

    const syncArg = mockSyncHubUser.mock.calls[0][0]
    expect(syncArg.sub).toBe('hub-user-abc-123')
    expect(syncArg.email).toBe('alice@example.com')
    expect(syncArg.username).toBe('alice')
    expect(syncArg.displayName).toBe('Alice Smith')
  })

  it('calls unrevokeSubject with the sub claim', async () => {
    await verifyAndSyncHubUser('valid-token')

    expect(mockUnrevokeSubject).toHaveBeenCalledWith('hub-user-abc-123')
  })

  it('propagates errors from verifyHubToken', async () => {
    mockVerifyIdToken.mockRejectedValue(new Error('Token expired'))

    await expect(verifyAndSyncHubUser('expired-token')).rejects.toThrow('Token expired')
    expect(mockSyncHubUser).not.toHaveBeenCalled()
    expect(mockUnrevokeSubject).not.toHaveBeenCalled()
  })

  it('propagates errors from syncHubUser', async () => {
    mockSyncHubUser.mockImplementation(() => {
      throw new Error('Database connection failed')
    })

    await expect(verifyAndSyncHubUser('valid-token')).rejects.toThrow('Database connection failed')
    expect(mockUnrevokeSubject).not.toHaveBeenCalled()
  })
})

describe('clearHubAuthCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearHubAuthCache()
  })

  it('resets the cached JWKS URI so next getJwksUri call re-discovers', async () => {
    mockDiscoverOidc.mockResolvedValue(fakeOidcMetadata as never)

    // Populate cache
    await getJwksUri()
    expect(mockDiscoverOidc).toHaveBeenCalledTimes(1)

    // Clear and verify re-discovery
    clearHubAuthCache()
    await getJwksUri()
    expect(mockDiscoverOidc).toHaveBeenCalledTimes(2)
  })
})
