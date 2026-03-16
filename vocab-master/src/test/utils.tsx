import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'

// Mock i18next translation function
vi.mock('react-i18next', () => ({
  useTranslation: (ns?: string) => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts) {
        // Return key with interpolated values for assertion readability
        return `${ns ? `${ns}:` : ''}${key}(${JSON.stringify(opts)})`
      }
      return `${ns ? `${ns}:` : ''}${key}`
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
  Trans: ({ children }: { children: ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))

interface WrapperProps {
  children: ReactNode
}

// eslint-disable-next-line react-refresh/only-export-components
function AllProviders({ children }: WrapperProps) {
  return (
    <MemoryRouter>
      {children}
    </MemoryRouter>
  )
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: AllProviders, ...options })
}

// Re-export everything from testing-library
export { customRender as render }
export { default as userEvent } from '@testing-library/user-event'
