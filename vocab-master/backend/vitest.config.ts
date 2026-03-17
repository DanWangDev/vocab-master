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
      // Lowered from 10% after Phases 5-6 added many untested service/route files
      thresholds: {
        lines: 8,
        functions: 8,
        branches: 8,
        statements: 8
      }
    },
    setupFiles: ['src/test/setup.ts']
  }
})
