import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { render, userEvent } from '../../../test/utils'
import { UserDetailModal } from '../UserDetailModal'
import { ApiService, type AdminUserDetails } from '../../../services/ApiService'

// Filter Framer Motion props to avoid React DOM warnings
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function filterMotionProps(props: Record<string, any>) {
  const motionKeys = ['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap', 'whileFocus', 'whileDrag', 'whileInView', 'variants', 'layout', 'layoutId']
  const filtered: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(props)) {
    if (!motionKeys.includes(k)) filtered[k] = v
  }
  return filtered
}

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...filterMotionProps(props)}>{children}</div>
    ),
    button: ({ children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
      <button {...filterMotionProps(props)}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock Recharts
vi.mock('recharts', () => {
  const Noop = () => null
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
    BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
    Line: Noop,
    Bar: Noop,
    XAxis: Noop,
    YAxis: Noop,
    CartesianGrid: Noop,
    Tooltip: Noop,
    Legend: Noop,
  }
})

// Mock the WeakWordsTable component
vi.mock('../WeakWordsTable', () => ({
  WeakWordsTable: ({ words }: { words: unknown[] }) => (
    <div data-testid="weak-words-table">Weak words: {Array.isArray(words) ? words.length : 0}</div>
  ),
}))

// Mock ApiService
vi.mock('../../../services/ApiService', async () => {
  const actual = await vi.importActual('../../../services/ApiService')
  return {
    ...actual,
    ApiService: {
      getAdminUserDetails: vi.fn(),
    },
  }
})

const mockDetails: AdminUserDetails = {
  quizHistory: [
    { id: 1, total_questions: 10, correct_answers: 8, accuracy: 80, completed_at: '2025-06-10T10:00:00Z', score: 80, total_time_spent: 120, quiz_type: 'multiple_choice' },
    { id: 2, total_questions: 10, correct_answers: 9, accuracy: 90, completed_at: '2025-06-11T10:00:00Z', score: 90, total_time_spent: 100, quiz_type: 'multiple_choice' },
  ],
  studyHistory: [
    { id: 1, words_reviewed: 20, start_time: '2025-06-10T08:00:00Z', end_time: '2025-06-10T08:10:00Z' },
    { id: 2, words_reviewed: 15, start_time: '2025-06-11T09:00:00Z', end_time: '2025-06-11T09:07:30Z' },
  ],
  weakWords: [
    { word: 'ephemeral', incorrect_count: 5, total_attempts: 8 },
  ],
  weeklyComparison: {
    this_week: { days_active: 3, quizzes: 2, sessions: 4, words: 35, time_minutes: 30, avg_accuracy: 85 },
    last_week: { days_active: 2, quizzes: 1, sessions: 3, words: 20, time_minutes: 20, avg_accuracy: 80 },
  },
  summary: {
    days_active_this_week: 3,
    total_time_this_week_minutes: 30,
    avg_accuracy: 85,
  },
}

describe('UserDetailModal', () => {
  beforeEach(() => {
    vi.mocked(ApiService.getAdminUserDetails).mockReset()
  })

  it('shows loading spinner initially', () => {
    vi.mocked(ApiService.getAdminUserDetails).mockReturnValue(new Promise(() => {}))

    render(
      <UserDetailModal user={{ id: 1, name: 'Alice' }} onClose={vi.fn()} />
    )

    // Loading spinner has the animate-spin class
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders student details after loading', async () => {
    vi.mocked(ApiService.getAdminUserDetails).mockResolvedValue(mockDetails)

    render(
      <UserDetailModal user={{ id: 1, name: 'Alice' }} onClose={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.queryByText(/parent:progress/)).toBeInTheDocument()
    })

    // Weekly comparison items should be visible
    expect(screen.getByText('parent:daysActive')).toBeInTheDocument()
    expect(screen.getByText('parent:quizzes')).toBeInTheDocument()

    // Stats cards - use getAllByText since '2' appears in multiple places
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1) // total quizzes
    expect(screen.getByText('85%')).toBeInTheDocument() // avg accuracy

    // Weak words table
    expect(screen.getByTestId('weak-words-table')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', async () => {
    vi.mocked(ApiService.getAdminUserDetails).mockResolvedValue(mockDetails)
    const handleClose = vi.fn()
    const eventSetup = userEvent.setup()

    render(
      <UserDetailModal user={{ id: 1, name: 'Alice' }} onClose={handleClose} />
    )

    await waitFor(() => {
      expect(screen.queryByText(/parent:progress/)).toBeInTheDocument()
    })

    // Click the footer close button
    await eventSetup.click(screen.getByText('parent:closeReport'))
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the X button is clicked', async () => {
    vi.mocked(ApiService.getAdminUserDetails).mockResolvedValue(mockDetails)
    const handleClose = vi.fn()
    const eventSetup = userEvent.setup()

    render(
      <UserDetailModal user={{ id: 1, name: 'Alice' }} onClose={handleClose} />
    )

    await waitFor(() => {
      expect(screen.queryByText(/parent:progress/)).toBeInTheDocument()
    })

    // The X button is the first button in the header area
    // It is the one inside the header div (not the footer)
    const buttons = screen.getAllByRole('button')
    // The first close button (X icon) is in the header
    await eventSetup.click(buttons[0])
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('shows error state when API call fails', async () => {
    vi.mocked(ApiService.getAdminUserDetails).mockRejectedValue(new Error('Network error'))

    render(
      <UserDetailModal user={{ id: 1, name: 'Alice' }} onClose={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByText('parent:failedToLoadData')).toBeInTheDocument()
    })
  })

  it('fetches details for the correct user id', () => {
    vi.mocked(ApiService.getAdminUserDetails).mockReturnValue(new Promise(() => {}))

    render(
      <UserDetailModal user={{ id: 42, name: 'Bob' }} onClose={vi.fn()} />
    )

    expect(ApiService.getAdminUserDetails).toHaveBeenCalledWith(42)
  })

  it('computes average accuracy from quiz history', async () => {
    const detailsWithAccuracy: AdminUserDetails = {
      ...mockDetails,
      quizHistory: [
        { id: 1, total_questions: 10, correct_answers: 7, accuracy: 70, completed_at: '2025-06-10T10:00:00Z', score: 70, total_time_spent: 120, quiz_type: 'multiple_choice' },
        { id: 2, total_questions: 10, correct_answers: 9, accuracy: 90, completed_at: '2025-06-11T10:00:00Z', score: 90, total_time_spent: 100, quiz_type: 'multiple_choice' },
      ],
    }
    vi.mocked(ApiService.getAdminUserDetails).mockResolvedValue(detailsWithAccuracy)

    render(
      <UserDetailModal user={{ id: 1, name: 'Alice' }} onClose={vi.fn()} />
    )

    await waitFor(() => {
      // avgAccuracy = Math.round((70 + 90) / 2) = 80
      expect(screen.getByText('80%')).toBeInTheDocument()
    })
  })

  it('shows dash for accuracy when no quiz data exists', async () => {
    const noQuizDetails: AdminUserDetails = {
      ...mockDetails,
      quizHistory: [],
    }
    vi.mocked(ApiService.getAdminUserDetails).mockResolvedValue(noQuizDetails)

    render(
      <UserDetailModal user={{ id: 1, name: 'Alice' }} onClose={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByText('-')).toBeInTheDocument()
    })
  })
})
