# Testing

## Running Tests

### Backend

```bash
cd packages/backend
npm test              # Run all tests (vitest)
npm run test:coverage # Run tests with coverage report
```

### Frontend

```bash
cd packages/frontend
npm test              # Run all tests (vitest + jsdom)
npm run test:coverage # Run tests with coverage report
```

### Lint and Type Check

```bash
# Frontend
cd packages/frontend
npx tsc --noEmit -p tsconfig.app.json   # TypeScript check
npx eslint src/                           # ESLint

# Backend
cd packages/backend
npx tsc --noEmit                          # TypeScript check
```

## Test Frameworks

| Package | Runner | Environment | Libraries |
|---------|--------|-------------|-----------|
| Backend | Vitest | Node.js | supertest |
| Frontend | Vitest | jsdom | @testing-library/react, @testing-library/jest-dom, @testing-library/user-event |

## Test Patterns

- Backend services place tests in `__tests__/` directories alongside the source code.
- Frontend tests use React Testing Library for component rendering and user interaction.
- Both packages use Vitest as the test runner with `vitest run` for CI (non-watch mode).

## Current Coverage

- **Backend:** ~10% statement coverage (threshold: 8%)
- **Frontend:** low coverage; growing as features stabilise

Coverage is tracked via `@vitest/coverage-v8` in both packages.

## CI Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs on every push and pull request to `master`. It consists of 5 jobs:

| Job | Name | What it does |
|-----|------|-------------|
| `lint` | Lint & Type Check | Installs both packages, runs `tsc --noEmit` for frontend and backend, runs ESLint on frontend |
| `test-backend` | Backend Tests | Installs backend, runs `npm test` and `npm run test:coverage` |
| `test-frontend` | Frontend Tests | Installs frontend, runs `npm test` and `npm run test:coverage` |
| `build` | Build | Builds both frontend and backend (depends on lint + tests passing) |
| `docker` | Docker Build | Runs `docker compose build` (depends on build passing) |

All jobs use Node.js 22 on `ubuntu-latest`. The `build` job depends on `lint`, `test-backend`, and `test-frontend`. The `docker` job depends on `build`.

A separate workflow (`.github/workflows/docker-image.yml`) handles Docker image builds.
