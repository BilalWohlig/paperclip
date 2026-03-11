# TOOLS.md -- Full-Stack Tester Tools

## Test Commands Reference (rag-chatbot/backend)

All commands are run from `projects/rag-chatbot/backend/`.

| Command | Purpose |
|---------|---------|
| `npm test` | Run all 14 Jest test suites (unit + integration + e2e + security) |
| `npm test -- --verbose` | Run all tests with per-test pass/fail detail (required for report generation) |
| `npm run test:coverage` | Run all tests and generate coverage report (statements, branches, functions, lines) |
| `npm run build` | TypeScript compilation check -- must produce zero errors for production readiness |
| `npx jest --listTests` | List all test file paths Jest will execute (useful for verifying test discovery) |
| `npx jest --testPathPattern='chat'` | Run only test files matching a pattern (for targeted investigation) |
| `npx jest --testPathPattern='security'` | Run only security tests |
| `npx jest --testPathPattern='integration/'` | Run only integration tests |
| `npx jest --testPathPattern='e2e/'` | Run only E2E tests |

## Test File Inventory

14 test files, ~173 test cases:

| File | Category | Test Count (approx) |
|------|----------|---------------------|
| `src/__tests__/chat.test.ts` | Core Unit | 5 |
| `src/__tests__/embedding.test.ts` | Core Unit | 4 |
| `src/__tests__/ingest.test.ts` | Core Unit | 6 |
| `src/__tests__/llm.test.ts` | Core Unit | 6 |
| `src/__tests__/pdf.test.ts` | Core Unit | 12 |
| `src/__tests__/retrieval.test.ts` | Core Unit | 4 |
| `src/__tests__/index.test.ts` | Core Unit | 5 |
| `src/__tests__/config.test.ts` | Config | 14 |
| `src/__tests__/error-handling.test.ts` | Error Handling | 23 |
| `src/__tests__/monitoring.test.ts` | Monitoring | 20 |
| `src/__tests__/security.test.ts` | Security | ~53 (includes parameterized) |
| `src/__tests__/integration/db.integration.test.ts` | Integration | 11 (self-skip if no DB) |
| `src/__tests__/integration/api.integration.test.ts` | Integration | 2 (self-skip if no DB) |
| `src/__tests__/e2e/full-flow.e2e.test.ts` | E2E | 9 |

## Jest Configuration

- Config file: `jest.config.js`
- Preset: `ts-jest`
- Test environment: `node`
- Test match pattern: `**/__tests__/**/*.test.ts`
- Setup file: `jest.setup.js` (sets `NODE_ENV=test` to prevent `app.listen()`)

## Environment Requirements

- `DATABASE_URL`: Required for integration tests to run (otherwise they self-skip gracefully)
- `NODE_ENV=test`: Set automatically by `jest.setup.js`
- `service_key.json`: Required by embedding and LLM services at module load time (mocked in all unit tests)
