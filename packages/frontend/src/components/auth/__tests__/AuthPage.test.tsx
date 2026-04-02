import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// --- mocks ---

const mockLogin = vi.fn().mockResolvedValue(undefined)
const mockNavigate = vi.fn()
const mockWasAutoLoginAttempted = vi.fn().mockReturnValue(false)
const mockMarkAutoLoginAttempted = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}))

vi.mock('../../../services/api/oidcHelpers', () => ({
  wasAutoLoginAttempted: () => mockWasAutoLoginAttempted(),
  markAutoLoginAttempted: () => mockMarkAutoLoginAttempted(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children as React.ReactNode}</div>,
  },
}))

vi.mock('lucide-react', () => ({
  BookOpen: () => <span data-testid="book-open" />,
  LogIn: () => <span data-testid="log-in" />,
}))

vi.mock('../../common/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <span data-testid="lang-switcher" />,
}))

// Mutable auth state — tests swap the shape before rendering
let mockAuthState: {
  state: { isLoading: boolean; isAuthenticated: boolean; error: string | null; user: unknown }
  login: typeof mockLogin
} = {
  state: { isLoading: false, isAuthenticated: false, error: null, user: null },
  login: mockLogin,
}

// --- helpers ---

function renderAuthPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthPage />
    </MemoryRouter>,
  )
}

// Lazy import so mocks are installed first
let AuthPage: React.ComponentType
beforeAll(async () => {
  const mod = await import('../AuthPage')
  AuthPage = mod.AuthPage
})

// --- tests ---

describe('AuthPage auto-login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthState = {
      state: { isLoading: false, isAuthenticated: false, error: null, user: null },
      login: mockLogin,
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('auto-starts OIDC login when no tokens and circuit breaker is clear', async () => {
    mockWasAutoLoginAttempted.mockReturnValue(false)

    renderAuthPage()

    await waitFor(() => {
      expect(mockMarkAutoLoginAttempted).toHaveBeenCalledTimes(1)
      expect(mockLogin).toHaveBeenCalledTimes(1)
    })
  })

  it('does NOT auto-login when circuit breaker is already set', async () => {
    mockWasAutoLoginAttempted.mockReturnValue(true)

    renderAuthPage()

    // Button should still be visible
    expect(screen.getByText('Sign in with 11+ Hub')).toBeInTheDocument()

    // Should not have triggered auto-login
    await waitFor(() => {
      expect(mockMarkAutoLoginAttempted).not.toHaveBeenCalled()
      expect(mockLogin).not.toHaveBeenCalled()
    })
  })

  it('does NOT auto-login while auth state is loading', async () => {
    mockAuthState.state.isLoading = true

    renderAuthPage()

    await waitFor(() => {
      expect(mockLogin).not.toHaveBeenCalled()
    })
  })

  it('does NOT auto-login when already authenticated', async () => {
    mockAuthState.state.isAuthenticated = true
    mockAuthState.state.user = { role: 'student', username: 'test' }

    renderAuthPage()

    await waitFor(() => {
      expect(mockLogin).not.toHaveBeenCalled()
    })
  })

  it('does NOT auto-login when there is an auth error', async () => {
    mockAuthState.state.error = 'Something went wrong'

    renderAuthPage()

    await waitFor(() => {
      expect(mockLogin).not.toHaveBeenCalled()
    })
    // Error should be displayed
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('manual login button still works as fallback', async () => {
    mockWasAutoLoginAttempted.mockReturnValue(true) // circuit breaker set, no auto-login
    const user = userEvent.setup()

    renderAuthPage()

    const button = screen.getByText('Sign in with 11+ Hub')
    await user.click(button)

    expect(mockLogin).toHaveBeenCalledTimes(1)
  })

  it('redirects student to / after authentication', async () => {
    mockAuthState.state.isAuthenticated = true
    mockAuthState.state.user = { role: 'student', username: 'test' }

    renderAuthPage()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })
  })

  it('redirects parent to /parent after authentication', async () => {
    mockAuthState.state.isAuthenticated = true
    mockAuthState.state.user = { role: 'parent', username: 'test' }

    renderAuthPage()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/parent', { replace: true })
    })
  })

  it('redirects admin to /admin after authentication', async () => {
    mockAuthState.state.isAuthenticated = true
    mockAuthState.state.user = { role: 'admin', username: 'test' }

    renderAuthPage()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true })
    })
  })
})
