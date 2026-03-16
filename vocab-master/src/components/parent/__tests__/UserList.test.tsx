import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { render, userEvent } from '../../../test/utils'
import { UserList } from '../UserList'
import type { AdminUserStats, ParentThresholds } from '../../../services/ApiService'

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
    button: ({ children, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
      <button {...filterMotionProps(props)}>{children}</button>
    ),
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...filterMotionProps(props)}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}))

function makeUser(overrides: Partial<AdminUserStats> = {}): AdminUserStats {
  return {
    id: 1,
    username: 'alice',
    display_name: 'Alice',
    role: 'student',
    parent_id: null,
    email: null,
    created_at: '2025-01-01T00:00:00Z',
    quizzes_taken: 5,
    total_words_studied: 50,
    last_study_date: '2025-06-14T10:00:00Z',
    last_seen_at: '2025-06-14T12:00:00Z',
    avg_accuracy: 85,
    current_streak: 3,
    sessions_this_week: 4,
    days_active_this_week: 3,
    total_time_this_week_minutes: 45,
    activity_status: 'active',
    ...overrides,
  }
}

describe('UserList', () => {
  it('renders empty state when no users', () => {
    render(
      <UserList users={[]} onSelectUser={vi.fn()} />
    )

    expect(screen.getByText('parent:noUsersFound')).toBeInTheDocument()
  })

  it('renders user cards with display names', () => {
    const users = [
      makeUser({ id: 1, display_name: 'Alice', username: 'alice' }),
      makeUser({ id: 2, display_name: 'Bob', username: 'bob' }),
    ]

    render(
      <UserList users={users} onSelectUser={vi.fn()} />
    )

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('falls back to username when display_name is null', () => {
    const users = [
      makeUser({ id: 1, display_name: null, username: 'charlie' }),
    ]

    render(
      <UserList users={users} onSelectUser={vi.fn()} />
    )

    expect(screen.getByText('charlie')).toBeInTheDocument()
  })

  it('calls onSelectUser when a user card is clicked', async () => {
    const user = makeUser({ id: 1, display_name: 'Alice' })
    const handleSelect = vi.fn()
    const eventSetup = userEvent.setup()

    render(
      <UserList users={[user]} onSelectUser={handleSelect} />
    )

    await eventSetup.click(screen.getByText('Alice'))
    expect(handleSelect).toHaveBeenCalledTimes(1)
    expect(handleSelect).toHaveBeenCalledWith(user)
  })

  it('shows reset password button for student users when handler provided', () => {
    const users = [makeUser({ id: 1, role: 'student' })]

    render(
      <UserList
        users={users}
        onSelectUser={vi.fn()}
        onResetPassword={vi.fn()}
      />
    )

    // The reset password button has a title attribute
    expect(screen.getByTitle('parent:resetPassword')).toBeInTheDocument()
  })

  it('does not show reset password button for non-student roles', () => {
    const users = [makeUser({ id: 1, role: 'parent' })]

    render(
      <UserList
        users={users}
        onSelectUser={vi.fn()}
        onResetPassword={vi.fn()}
      />
    )

    expect(screen.queryByTitle('parent:resetPassword')).not.toBeInTheDocument()
  })

  it('calls onResetPassword without triggering onSelectUser', async () => {
    const user = makeUser({ id: 1, role: 'student', display_name: 'Alice' })
    const handleSelect = vi.fn()
    const handleReset = vi.fn()
    const eventSetup = userEvent.setup()

    render(
      <UserList
        users={[user]}
        onSelectUser={handleSelect}
        onResetPassword={handleReset}
      />
    )

    await eventSetup.click(screen.getByTitle('parent:resetPassword'))
    expect(handleReset).toHaveBeenCalledTimes(1)
    expect(handleReset).toHaveBeenCalledWith(user)
    // stopPropagation should prevent parent click
    expect(handleSelect).not.toHaveBeenCalled()
  })

  it('sorts users by urgency: inactive first, then some, then active', () => {
    const users = [
      makeUser({ id: 1, display_name: 'Active', activity_status: 'active', last_seen_at: '2025-06-15T10:00:00Z' }),
      makeUser({ id: 2, display_name: 'Inactive', activity_status: 'inactive', last_seen_at: '2025-06-01T10:00:00Z' }),
      makeUser({ id: 3, display_name: 'Some', activity_status: 'some', last_seen_at: '2025-06-10T10:00:00Z' }),
    ]

    render(
      <UserList users={users} onSelectUser={vi.fn()} />
    )

    const cards = screen.getAllByRole('button')
    // First card should be the inactive user
    expect(cards[0]).toHaveTextContent('Inactive')
    expect(cards[1]).toHaveTextContent('Some')
    expect(cards[2]).toHaveTextContent('Active')
  })

  it('shows on-track badge when thresholds are provided and user meets them', () => {
    const thresholds: ParentThresholds = { days_per_week: 3, minutes_per_day: 15 }
    const users = [makeUser({ id: 1, days_active_this_week: 4 })]

    render(
      <UserList users={users} onSelectUser={vi.fn()} thresholds={thresholds} />
    )

    expect(screen.getByText('parent:onTrack')).toBeInTheDocument()
  })

  it('shows below-target badge when user does not meet thresholds', () => {
    const thresholds: ParentThresholds = { days_per_week: 5, minutes_per_day: 15 }
    const users = [makeUser({ id: 1, days_active_this_week: 2 })]

    render(
      <UserList users={users} onSelectUser={vi.fn()} thresholds={thresholds} />
    )

    expect(screen.getByText('parent:belowTarget')).toBeInTheDocument()
  })

  it('does not show on-track badge when thresholds are not provided', () => {
    const users = [makeUser({ id: 1 })]

    render(
      <UserList users={users} onSelectUser={vi.fn()} />
    )

    expect(screen.queryByText('parent:onTrack')).not.toBeInTheDocument()
    expect(screen.queryByText('parent:belowTarget')).not.toBeInTheDocument()
  })

  it('shows streak information for active users', () => {
    const users = [makeUser({ id: 1, current_streak: 5 })]

    render(
      <UserList users={users} onSelectUser={vi.fn()} />
    )

    // The streak days text comes from t('days', { count: 5 }) - multiple 'days' matches possible
    expect(screen.getAllByText(/parent:days/).length).toBeGreaterThanOrEqual(1)
  })

  it('shows dash for zero streak', () => {
    const users = [makeUser({ id: 1, current_streak: 0 })]

    render(
      <UserList users={users} onSelectUser={vi.fn()} />
    )

    expect(screen.getByText('-')).toBeInTheDocument()
  })

  it('shows "never" when user has no last_seen_at or last_study_date', () => {
    const users = [makeUser({ id: 1, last_seen_at: null, last_study_date: null })]

    render(
      <UserList users={users} onSelectUser={vi.fn()} />
    )

    // Both the header and the detail section show "never"
    const neverTexts = screen.getAllByText('parent:never')
    expect(neverTexts.length).toBeGreaterThanOrEqual(1)
  })
})
