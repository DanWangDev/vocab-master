import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/services/**', 'src/routes/**', 'src/middleware/**'],
      exclude: ['src/**/*.test.ts'],
      // TODO: raise thresholds as test coverage improves
      thresholds: {
        lines: 10,
        functions: 10,
        branches: 10,
        statements: 10
      }
    },
    setupFiles: ['src/test/setup.ts']
  }
})
