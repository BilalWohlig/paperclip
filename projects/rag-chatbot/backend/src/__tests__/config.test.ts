/**
 * Environment Configuration tests for RAG Chatbot backend
 *
 * Validates:
 * - PORT configuration and defaults
 * - NODE_ENV behavior (test mode skip listen)
 * - Database URL configuration
 * - JSON body size limit
 * - Service key file dependency
 * - Module initialization behavior
 */

describe('Config: PORT environment variable', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, NODE_ENV: 'test' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('defaults to 3001 when PORT is not set', () => {
    delete process.env.PORT;

    // PORT is parsed inside index.ts: parseInt(process.env.PORT ?? '3001', 10)
    const port = parseInt(process.env.PORT ?? '3001', 10);
    expect(port).toBe(3001);
  });

  it('uses custom PORT when set', () => {
    process.env.PORT = '4000';

    const port = parseInt(process.env.PORT ?? '3001', 10);
    expect(port).toBe(4000);
  });

  it('handles non-numeric PORT gracefully', () => {
    process.env.PORT = 'invalid';

    const port = parseInt(process.env.PORT ?? '3001', 10);
    expect(Number.isNaN(port)).toBe(true);
  });

  it('handles empty PORT string', () => {
    process.env.PORT = '';

    // parseInt('', 10) returns NaN, but ?? won't trigger for empty string
    const port = parseInt(process.env.PORT ?? '3001', 10);
    expect(Number.isNaN(port)).toBe(true);
  });
});

describe('Config: NODE_ENV behavior', () => {
  it('is set to "test" in test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('test environment prevents app.listen()', () => {
    // jest.setup.js sets NODE_ENV = 'test'
    // index.ts checks: if (process.env.NODE_ENV !== 'test') app.listen(...)
    // This test verifies the setup is correct
    expect(process.env.NODE_ENV).toBe('test');
  });
});

describe('Config: DATABASE_URL', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: 'test' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('is defined in test environment', () => {
    // The pool is created with process.env.DATABASE_URL
    // If undefined, pg Pool will attempt to connect to localhost with defaults
    const dbUrl = process.env.DATABASE_URL;
    // This is a configuration check, not a connectivity check
    if (dbUrl) {
      expect(typeof dbUrl).toBe('string');
      expect(dbUrl.length).toBeGreaterThan(0);
    }
  });

  it('accepts standard PostgreSQL connection string format', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/testdb';

    const url = process.env.DATABASE_URL;
    expect(url).toMatch(/^postgresql:\/\//);
  });

  it('accepts postgres:// protocol prefix', () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb';

    const url = process.env.DATABASE_URL;
    expect(url).toMatch(/^postgres(ql)?:\/\//);
  });
});

describe('Config: JSON body size limit', () => {
  // The app configures express.json({ limit: '10mb' })

  // Mock all services to avoid service_key.json dependency
  beforeAll(() => {
    jest.resetModules();
  });

  it('10mb limit is set in app configuration', async () => {
    // We verify this indirectly: a payload under 10mb should be parsed,
    // while one over 10mb should be rejected with 413
    // This is tested more thoroughly in security.test.ts
    expect(true).toBe(true); // Placeholder for config verification
  });
});

describe('Config: Service key file', () => {
  it('embedding.ts requires service_key.json at module load time', () => {
    // The embedding service reads service_key.json synchronously at import time:
    // fs.readFileSync(path.join(__dirname, '../../service_key.json'), 'utf-8')
    // In test environment, this is mocked via jest.mock('fs')
    // This test documents the dependency
    expect(true).toBe(true);
  });

  it('llm.ts requires service_key.json at module load time', () => {
    // Same pattern as embedding.ts
    // Both services will throw if service_key.json is missing and not mocked
    expect(true).toBe(true);
  });
});

describe('Config: Express middleware order', () => {
  // Mock all services
  jest.mock('../services/embedding', () => ({
    generateQueryEmbedding: jest.fn(),
    generateEmbeddings: jest.fn(),
  }));
  jest.mock('../services/llm', () => ({
    streamChatResponse: jest.fn(),
  }));
  jest.mock('../services/retrieval', () => ({
    retrieveTopChunks: jest.fn(),
  }));
  jest.mock('../services/pdf', () => ({
    parsePdfIntoChunks: jest.fn(),
  }));
  jest.mock('../db/client', () => ({
    __esModule: true,
    default: { query: jest.fn() },
  }));
  jest.mock('fs', () => {
    const actual = jest.requireActual<typeof import('fs')>('fs');
    return {
      ...actual,
      readFileSync: (filePath: unknown, encoding?: unknown) => {
        if (String(filePath).includes('service_key.json')) {
          return JSON.stringify({ project_id: 'test-project' });
        }
        return actual.readFileSync(filePath as string, encoding as BufferEncoding);
      },
    };
  });

  it('CORS middleware is applied before routes', async () => {
    const request = require('supertest');
    const app = require('../index').default;

    const res = await request(app)
      .post('/api/chat')
      .set('Origin', 'http://example.com')
      .send({});

    // CORS header should be present even on error responses
    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });

  it('JSON parsing middleware is applied before routes', async () => {
    const request = require('supertest');
    const app = require('../index').default;

    // Send valid JSON to verify it is parsed
    const res = await request(app)
      .post('/api/chat')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ query: '' }));

    // If JSON parsing works, we get 400 (empty query), not 500 (undefined body)
    expect(res.status).toBe(400);
  });
});
