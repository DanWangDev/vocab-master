type LogLevel = 'info' | 'warn' | 'error' | 'audit';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

function formatEntry(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  };
  return JSON.stringify(entry);
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>): void {
    process.stdout.write(formatEntry('info', message, meta) + '\n');
  },

  warn(message: string, meta?: Record<string, unknown>): void {
    process.stdout.write(formatEntry('warn', message, meta) + '\n');
  },

  error(message: string, meta?: Record<string, unknown>): void {
    process.stderr.write(formatEntry('error', message, meta) + '\n');
  },

  audit(message: string, meta?: Record<string, unknown>): void {
    process.stdout.write(formatEntry('audit', message, meta) + '\n');
  }
};
