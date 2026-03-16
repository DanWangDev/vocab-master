import { logger } from '../services/logger.js';

interface Job {
  name: string;
  handler: () => void | Promise<void>;
  intervalMs: number;
  lastRun: number;
  timer: ReturnType<typeof setInterval> | null;
  running: boolean;
}

class JobQueue {
  private jobs = new Map<string, Job>();

  register(name: string, handler: () => void | Promise<void>, intervalMs: number): void {
    if (this.jobs.has(name)) {
      logger.warn('Job already registered, replacing', { job: name });
      this.unregister(name);
    }

    const job: Job = {
      name,
      handler,
      intervalMs,
      lastRun: 0,
      timer: null,
      running: false
    };

    this.jobs.set(name, job);
    logger.info('Job registered', { job: name, intervalMs });
  }

  start(name: string): void {
    const job = this.jobs.get(name);
    if (!job) {
      logger.warn('Job not found', { job: name });
      return;
    }

    if (job.timer) return; // Already running

    const execute = async () => {
      if (job.running) {
        logger.warn('Job still running, skipping', { job: name });
        return;
      }

      job.running = true;
      try {
        await job.handler();
        job.lastRun = Date.now();
      } catch (error) {
        logger.error('Job failed', { job: name, error: String(error) });
      } finally {
        job.running = false;
      }
    };

    job.timer = setInterval(execute, job.intervalMs);

    // Run immediately on start
    execute();
  }

  startAll(): void {
    for (const name of this.jobs.keys()) {
      this.start(name);
    }
  }

  stop(name: string): void {
    const job = this.jobs.get(name);
    if (!job || !job.timer) return;

    clearInterval(job.timer);
    job.timer = null;
    logger.info('Job stopped', { job: name });
  }

  stopAll(): void {
    for (const name of this.jobs.keys()) {
      this.stop(name);
    }
  }

  unregister(name: string): void {
    this.stop(name);
    this.jobs.delete(name);
  }

  getStatus(): Array<{ name: string; lastRun: number; running: boolean; intervalMs: number }> {
    return Array.from(this.jobs.values()).map(job => ({
      name: job.name,
      lastRun: job.lastRun,
      running: job.running,
      intervalMs: job.intervalMs
    }));
  }
}

export const jobQueue = new JobQueue();
