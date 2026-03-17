import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { formatDate, formatNumber, formatPercent, formatRelativeTime } from '../formatters'

describe('formatDate', () => {
  it('formats a date string for en-US locale', () => {
    const result = formatDate('2025-06-15', 'en')
    expect(result).toContain('Jun')
    expect(result).toContain('15')
    expect(result).toContain('2025')
  })

  it('formats a date string for zh-CN locale', () => {
    const result = formatDate('2025-06-15', 'zh-CN')
    expect(result).toContain('2025')
  })

  it('formats a Date object', () => {
    const date = new Date(2025, 5, 15)
    const result = formatDate(date, 'en')
    expect(result).toContain('Jun')
    expect(result).toContain('15')
  })

  it('handles ISO date strings', () => {
    const result = formatDate('2025-01-01T12:00:00Z', 'en')
    expect(result).toContain('2025')
    expect(result).toContain('Jan')
  })
})

describe('formatNumber', () => {
  it('formats small numbers for en-US', () => {
    expect(formatNumber(42, 'en')).toBe('42')
  })

  it('formats large numbers with commas for en-US', () => {
    expect(formatNumber(1234567, 'en')).toBe('1,234,567')
  })

  it('formats numbers for zh-CN locale', () => {
    const result = formatNumber(1234567, 'zh-CN')
    expect(result).toContain('1')
    expect(result).toContain('234')
    expect(result).toContain('567')
  })

  it('formats zero', () => {
    expect(formatNumber(0, 'en')).toBe('0')
  })

  it('formats negative numbers', () => {
    const result = formatNumber(-500, 'en')
    expect(result).toContain('500')
  })
})

describe('formatPercent', () => {
  it('formats a decimal as percent for en-US', () => {
    expect(formatPercent(0.85, 'en')).toBe('85%')
  })

  it('formats zero percent', () => {
    expect(formatPercent(0, 'en')).toBe('0%')
  })

  it('formats 100 percent', () => {
    expect(formatPercent(1, 'en')).toBe('100%')
  })

  it('limits fraction digits to 1', () => {
    const result = formatPercent(0.8567, 'en')
    // Should be 85.7% not 85.67%
    expect(result).toBe('85.7%')
  })

  it('formats percent for zh-CN locale', () => {
    const result = formatPercent(0.5, 'zh-CN')
    expect(result).toContain('50')
  })
})

describe('formatRelativeTime', () => {
  let nowSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Fix "now" to a known point in time: 2025-06-15T12:00:00Z
    const fakeNow = new Date('2025-06-15T12:00:00Z')
    nowSpy = vi.spyOn(Date, 'now').mockReturnValue(fakeNow.getTime())
    // Override the Date constructor for "new Date()" with no args
    vi.useFakeTimers({ now: fakeNow })
  })

  afterEach(() => {
    nowSpy.mockRestore()
    vi.useRealTimers()
  })

  it('returns "Just now" for less than 1 minute ago (en)', () => {
    const thirtySecsAgo = new Date('2025-06-15T11:59:40Z')
    expect(formatRelativeTime(thirtySecsAgo, 'en')).toBe('Just now')
  })

  it('returns Chinese equivalent for just now (zh-CN)', () => {
    const thirtySecsAgo = new Date('2025-06-15T11:59:40Z')
    expect(formatRelativeTime(thirtySecsAgo, 'zh-CN')).toBe('刚刚')
  })

  it('returns minutes ago for less than 1 hour', () => {
    const tenMinsAgo = new Date('2025-06-15T11:50:00Z')
    expect(formatRelativeTime(tenMinsAgo, 'en')).toBe('10m ago')
  })

  it('returns Chinese minutes ago', () => {
    const tenMinsAgo = new Date('2025-06-15T11:50:00Z')
    expect(formatRelativeTime(tenMinsAgo, 'zh-CN')).toBe('10分钟前')
  })

  it('returns hours ago for less than 24 hours', () => {
    const threeHoursAgo = new Date('2025-06-15T09:00:00Z')
    expect(formatRelativeTime(threeHoursAgo, 'en')).toBe('3h ago')
  })

  it('returns Chinese hours ago', () => {
    const threeHoursAgo = new Date('2025-06-15T09:00:00Z')
    expect(formatRelativeTime(threeHoursAgo, 'zh-CN')).toBe('3小时前')
  })

  it('returns "Yesterday" for exactly 1 day ago', () => {
    const yesterday = new Date('2025-06-14T12:00:00Z')
    expect(formatRelativeTime(yesterday, 'en')).toBe('Yesterday')
  })

  it('returns Chinese yesterday', () => {
    const yesterday = new Date('2025-06-14T12:00:00Z')
    expect(formatRelativeTime(yesterday, 'zh-CN')).toBe('昨天')
  })

  it('returns days ago for 2-6 days', () => {
    const threeDaysAgo = new Date('2025-06-12T12:00:00Z')
    expect(formatRelativeTime(threeDaysAgo, 'en')).toBe('3d ago')
  })

  it('returns formatted date for 7+ days ago', () => {
    const twoWeeksAgo = new Date('2025-06-01T12:00:00Z')
    const result = formatRelativeTime(twoWeeksAgo, 'en')
    expect(result).toContain('Jun')
    expect(result).toContain('1')
  })

  it('accepts string dates', () => {
    expect(formatRelativeTime('2025-06-15T11:59:40Z', 'en')).toBe('Just now')
  })
})
