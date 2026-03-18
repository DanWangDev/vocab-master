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
      thresholds: {
        lines: 20,
        functions: 20,
        branches: 20,
        statements: 20
      }
    },
    setupFiles: ['src/test/setup.ts']
  }
})
