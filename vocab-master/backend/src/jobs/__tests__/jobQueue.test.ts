import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { jobQueue } from '../jobQueue'

describe('JobQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    for (const status of jobQueue.getStatus()) {
      jobQueue.unregister(status.name)
    }
  })

  afterEach(() => {
    jobQueue.stopAll()
    for (const status of jobQueue.getStatus()) {
      jobQueue.unregister(status.name)
    }
    vi.useRealTimers()
  })

  it('registers a job that appears in getStatus', () => {
    const handler = vi.fn()

    jobQueue.register('test-job', handler, 10_000)

    const statuses = jobQueue.getStatus()
    expect(statuses).toHaveLength(1)
    expect(statuses[0]).toMatchObject({
      name: 'test-job',
      intervalMs: 10_000,
      running: false,
      lastRun: 0
    })
  })

  it('replaces existing job when re-registering same name', () => {
    const handler1 = vi.fn()
    const handler2 = vi.fn()

    jobQueue.register('replaceable', handler1, 5000)
    jobQueue.register('replaceable', handler2, 8000)

    const statuses = jobQueue.getStatus()
    expect(statuses).toHaveLength(1)
    expect(statuses[0].intervalMs).toBe(8000)
  })

  it('runs handler immediately on start', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)

    jobQueue.register('immediate', handler, 60_000)
    jobQueue.start('immediate')

    // Flush the microtask queue for the async execute()
    await vi.advanceTimersByTimeAsync(0)

    expect(handler).toHaveBeenCalledOnce()
  })

  it('runs handler on interval after start', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)

    jobQueue.register('interval-job', handler, 5000)
    jobQueue.start('interval-job')

    // Flush immediate execution
    await vi.advanceTimersByTimeAsync(0)
    expect(handler).toHaveBeenCalledTimes(1)

    // Advance to first interval
    await vi.advanceTimersByTimeAsync(5000)
    expect(handler).toHaveBeenCalledTimes(2)

    // Advance to second interval
    await vi.advanceTimersByTimeAsync(5000)
    expect(handler).toHaveBeenCalledTimes(3)
  })

  it('does not error when starting a non-existent job', () => {
    expect(() => jobQueue.start('ghost-job')).not.toThrow()
  })

  it('is idempotent - calling start twice does not create duplicate timers', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)

    jobQueue.register('idempotent', handler, 5000)
    jobQueue.start('idempotent')
    jobQueue.start('idempotent')

    await vi.advanceTimersByTimeAsync(0)

    // Should have been called only once (not twice from two starts)
    expect(handler).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(5000)

    // One interval tick - should be 2 total, not 3
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('stops a running job by clearing its timer', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)

    jobQueue.register('stoppable', handler, 5000)
    jobQueue.start('stoppable')

    await vi.advanceTimersByTimeAsync(0)
    expect(handler).toHaveBeenCalledTimes(1)

    jobQueue.stop('stoppable')

    await vi.advanceTimersByTimeAsync(10_000)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not error when stopping a non-existent job', () => {
    expect(() => jobQueue.stop('phantom')).not.toThrow()
  })

  it('stops all running jobs', async () => {
    const handler1 = vi.fn().mockResolvedValue(undefined)
    const handler2 = vi.fn().mockResolvedValue(undefined)

    jobQueue.register('job-a', handler1, 5000)
    jobQueue.register('job-b', handler2, 5000)
    jobQueue.startAll()

    await vi.advanceTimersByTimeAsync(0)
    expect(handler1).toHaveBeenCalledTimes(1)
    expect(handler2).toHaveBeenCalledTimes(1)

    jobQueue.stopAll()

    await vi.advanceTimersByTimeAsync(10_000)
    expect(handler1).toHaveBeenCalledTimes(1)
    expect(handler2).toHaveBeenCalledTimes(1)
  })

  it('starts all registered jobs', async () => {
    const handler1 = vi.fn().mockResolvedValue(undefined)
    const handler2 = vi.fn().mockResolvedValue(undefined)

    jobQueue.register('all-a', handler1, 5000)
    jobQueue.register('all-b', handler2, 5000)
    jobQueue.startAll()

    await vi.advanceTimersByTimeAsync(0)

    expect(handler1).toHaveBeenCalledOnce()
    expect(handler2).toHaveBeenCalledOnce()
  })

  it('unregisters a job completely', () => {
    const handler = vi.fn()

    jobQueue.register('removable', handler, 5000)
    expect(jobQueue.getStatus()).toHaveLength(1)

    jobQueue.unregister('removable')

    expect(jobQueue.getStatus()).toHaveLength(0)
  })

  it('returns correct status for all jobs', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)

    jobQueue.register('status-job', handler, 10_000)
    jobQueue.start('status-job')

    await vi.advanceTimersByTimeAsync(0)

    const statuses = jobQueue.getStatus()
    expect(statuses).toHaveLength(1)
    expect(statuses[0].name).toBe('status-job')
    expect(statuses[0].running).toBe(false)
    expect(statuses[0].lastRun).toBeGreaterThan(0)
    expect(statuses[0].intervalMs).toBe(10_000)
  })

  it('updates lastRun timestamp after handler executes', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)
    const startTime = Date.now()

    jobQueue.register('timestamp-job', handler, 5000)
    jobQueue.start('timestamp-job')

    await vi.advanceTimersByTimeAsync(0)

    const statuses = jobQueue.getStatus()
    expect(statuses[0].lastRun).toBeGreaterThanOrEqual(startTime)
  })

  it('prevents concurrent execution when handler is still running', async () => {
    let resolveHandler: () => void
    const handlerPromise = new Promise<void>(resolve => {
      resolveHandler = resolve
    })
    let callCount = 0
    const handler = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return handlerPromise
      }
      return Promise.resolve()
    })

    jobQueue.register('slow-job', handler, 1000)
    jobQueue.start('slow-job')

    // Immediate execution starts (handler is now "running")
    await vi.advanceTimersByTimeAsync(0)
    expect(handler).toHaveBeenCalledTimes(1)

    // Interval fires while handler is still running
    await vi.advanceTimersByTimeAsync(1000)
    // Handler was called again but the guard should have skipped execution
    // Actually the interval calls execute() which checks job.running
    expect(handler).toHaveBeenCalledTimes(1)

    // Resolve the first handler
    resolveHandler!()
    await vi.advanceTimersByTimeAsync(0)

    // Next interval should now execute normally
    await vi.advanceTimersByTimeAsync(1000)
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('handles async errors gracefully without crashing', async () => {
    const handler = vi.fn()
      .mockRejectedValueOnce(new Error('job failure'))
      .mockResolvedValue(undefined)

    jobQueue.register('error-job', handler, 5000)
    jobQueue.start('error-job')

    // First run throws
    await vi.advanceTimersByTimeAsync(0)
    expect(handler).toHaveBeenCalledTimes(1)

    // Second run should still execute
    await vi.advanceTimersByTimeAsync(5000)
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('calls handler with no arguments', async () => {
    const handler = vi.fn().mockResolvedValue(undefined)

    jobQueue.register('no-args', handler, 5000)
    jobQueue.start('no-args')

    await vi.advanceTimersByTimeAsync(0)

    expect(handler).toHaveBeenCalledWith()
  })
})
