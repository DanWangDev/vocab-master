export const logger = {
  error(message: string, meta?: Record<string, unknown>): void {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error(message, meta)
    }
  },
}
