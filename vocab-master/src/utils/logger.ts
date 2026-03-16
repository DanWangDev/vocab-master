export const logger = {
  error(message: string, meta?: Record<string, unknown>): void {
    if (import.meta.env.DEV) {
      console.error(message, meta)
    }
  },
}
