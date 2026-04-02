import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthCallback } from '../AuthCallback'

vi.mock('lucide-react', () => ({
  Loader2: (props: Record<string, unknown>) => <div data-testid="loader" {...props} />,
}))

const mockExchangeCodeForTokens = vi.fn()
const mockStoreOidcTokens = vi.fn()
const mockClearAutoLoginAttempted = vi.fn()

vi.mock('../../services/api/oidcHelpers', () => ({
  exchangeCodeForTokens: (...args: unknown[]) => mockExchangeCodeForTokens(...args),
  storeOidcTokens: (...args: unknown[]) => mockStoreOidcTokens(...args),
  clearAutoLoginAttempted: (...args: unknown[]) => mockClearAutoLoginAttempted(...args),
}))

describe('AuthCallback', () => {
  const originalLocation = window.location

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'location', {
      value: {
        search: '',
        href: '',
        origin: 'http://localhost:3000',
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    })
  })

  describe('Loading state', () => {
    it('shows "Signing you in..." text initially while processing', () => {
      mockExchangeCodeForTokens.mockReturnValue(new Promise(() => {}))
      window.location.search = '?code=test-code&state=test-state'

      render(<AuthCallback />)

      expect(screen.getByText('Signing you in...')).toBeInTheDocument()
      expect(screen.getByTestId('loader')).toBeInTheDocument()
    })
  })

  describe('Error from hub', () => {
    it('shows "Authentication Failed" when URL has ?error=access_denied', async () => {
      window.location.search = '?error=access_denied'

      render(<AuthCallback />)

      await waitFor(() => {
        expect(screen.getByText('Authentication Failed')).toBeInTheDocument()
      })
      expect(screen.getByText('access_denied')).toBeInTheDocument()
    })

    it('shows the error_description when provided', async () => {
      window.location.search = '?error=access_denied&error_description=User%20denied'

      render(<AuthCallback />)

      await waitFor(() => {
        expect(screen.getByText('Authentication Failed')).toBeInTheDocument()
      })
      expect(screen.getByText('User denied')).toBeInTheDocument()
    })
  })

  describe('Missing params', () => {
    it('shows error when no code or state in URL', async () => {
      window.location.search = ''

      render(<AuthCallback />)

      await waitFor(() => {
        expect(screen.getByText('Authentication Failed')).toBeInTheDocument()
      })
      expect(
        screen.getByText('Missing authorization code or state parameter'),
      ).toBeInTheDocument()
    })
  })

  describe('Successful exchange', () => {
    it('calls exchangeCodeForTokens, stores tokens, and redirects to "/"', async () => {
      const tokens = {
        id_token: 'test-id-token',
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
      }
      mockExchangeCodeForTokens.mockResolvedValue(tokens)
      window.location.search = '?code=test-code&state=test-state'

      render(<AuthCallback />)

      await waitFor(() => {
        expect(mockExchangeCodeForTokens).toHaveBeenCalledWith(
          'test-code',
          'test-state',
        )
      })
      expect(mockStoreOidcTokens).toHaveBeenCalledWith(tokens)
      expect(mockClearAutoLoginAttempted).toHaveBeenCalled()
      expect(window.location.href).toBe('/')
    })
  })

  describe('Exchange failure', () => {
    it('shows error message when exchangeCodeForTokens throws an Error', async () => {
      mockExchangeCodeForTokens.mockRejectedValue(
        new Error('Invalid OIDC state parameter'),
      )
      window.location.search = '?code=test-code&state=test-state'

      render(<AuthCallback />)

      await waitFor(() => {
        expect(screen.getByText('Authentication Failed')).toBeInTheDocument()
      })
      expect(
        screen.getByText('Invalid OIDC state parameter'),
      ).toBeInTheDocument()
    })

    it('shows "Authentication failed" when a non-Error is thrown', async () => {
      mockExchangeCodeForTokens.mockRejectedValue('unexpected failure')
      window.location.search = '?code=test-code&state=test-state'

      render(<AuthCallback />)

      await waitFor(() => {
        expect(screen.getByText('Authentication Failed')).toBeInTheDocument()
      })
      expect(screen.getByText('Authentication failed')).toBeInTheDocument()
    })
  })

  describe('Back to Login link', () => {
    it('shows a "Back to Login" link pointing to /login in error state', async () => {
      window.location.search = '?error=access_denied'

      render(<AuthCallback />)

      await waitFor(() => {
        expect(screen.getByText('Authentication Failed')).toBeInTheDocument()
      })

      const link = screen.getByRole('link', { name: 'Back to Login' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/login')
    })
  })
})
