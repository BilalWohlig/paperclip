/**
 * Monitoring and Observability tests for RAG Chatbot backend
 *
 * Validates:
 * - Health check endpoint behavior
 * - Response headers for caching and SSE
 * - Status code correctness across all endpoints
 * - Response time characteristics (no artificial delays)
 * - Error logging behavior
 * - Service availability indicators
 */

// Mock all services to isolate the app wiring
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
    existsSync: jest.fn(),
    readFileSync: (filePath: unknown, encoding?: unknown) => {
      if (String(filePath).includes('service_key.json')) {
        return JSON.stringify({ project_id: 'test-project' });
      }
      return actual.readFileSync(filePath as string, encoding as BufferEncoding);
    },
  };
});

import request from 'supertest';
import app from '../index';

describe('Health Check: GET /api/health', () => {
  it('returns 200 with { status: "ok" }', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('responds with JSON content type', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('responds quickly (under 100ms)', async () => {
    const start = Date.now();
    await request(app).get('/api/health');
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(100);
  });

  it('is idempotent across multiple calls', async () => {
    const res1 = await request(app).get('/api/health');
    const res2 = await request(app).get('/api/health');
    const res3 = await request(app).get('/api/health');

    expect(res1.body).toEqual(res2.body);
    expect(res2.body).toEqual(res3.body);
  });

  it('works with various HTTP accept headers', async () => {
    const res1 = await request(app)
      .get('/api/health')
      .set('Accept', 'application/json');
    expect(res1.status).toBe(200);

    const res2 = await request(app)
      .get('/api/health')
      .set('Accept', '*/*');
    expect(res2.status).toBe(200);

    const res3 = await request(app)
      .get('/api/health')
      .set('Accept', 'text/html');
    expect(res3.status).toBe(200);
  });

  it('does not leak sensitive information', async () => {
    const res = await request(app).get('/api/health');

    // Should only contain status field
    const keys = Object.keys(res.body);
    expect(keys).toEqual(['status']);
    // Should not expose internal details
    expect(res.body).not.toHaveProperty('version');
    expect(res.body).not.toHaveProperty('uptime');
    expect(res.body).not.toHaveProperty('database');
    expect(res.body).not.toHaveProperty('env');
  });
});

describe('Response Headers: CORS', () => {
  it('includes Access-Control-Allow-Origin on health endpoint', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');

    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });

  it('handles preflight OPTIONS requests', async () => {
    const res = await request(app)
      .options('/api/chat')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBeDefined();
    expect(res.headers['access-control-allow-methods']).toBeDefined();
  });

  it('includes CORS headers on error responses', async () => {
    const res = await request(app)
      .post('/api/chat')
      .set('Origin', 'http://localhost:5173')
      .send({});

    expect(res.status).toBe(400);
    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });
});

describe('Response Headers: SSE', () => {
  it('SSE responses include correct headers', async () => {
    const { generateQueryEmbedding } = require('../services/embedding');
    const { retrieveTopChunks } = require('../services/retrieval');

    (generateQueryEmbedding as jest.Mock).mockResolvedValue(Array(3072).fill(0.1));
    (retrieveTopChunks as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .post('/api/chat')
      .send({ query: 'test query' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    expect(res.headers['cache-control']).toBe('no-cache');
    expect(res.headers['connection']).toBe('keep-alive');
  });
});

describe('Route Coverage: 404 for unknown endpoints', () => {
  it('returns 404 for unknown GET paths', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.status).toBe(404);
  });

  it('returns 404 for unknown POST paths', async () => {
    const res = await request(app).post('/api/unknown').send({});
    expect(res.status).toBe(404);
  });

  it('returns 404 for root path', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(404);
  });

  it('returns 404 for /api without sub-path', async () => {
    const res = await request(app).get('/api');
    expect(res.status).toBe(404);
  });

  it('returns 404 for /api/health with POST method', async () => {
    const res = await request(app).post('/api/health').send({});
    expect(res.status).toBe(404);
  });
});

describe('Endpoint Enumeration: All registered routes respond correctly', () => {
  it('GET /api/health returns 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('POST /api/chat returns non-404 for valid request shape', async () => {
    const { generateQueryEmbedding } = require('../services/embedding');
    const { retrieveTopChunks } = require('../services/retrieval');

    (generateQueryEmbedding as jest.Mock).mockResolvedValue(Array(3072).fill(0.1));
    (retrieveTopChunks as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .post('/api/chat')
      .send({ query: 'test' });

    expect(res.status).not.toBe(404);
  });

  it('POST /api/ingest returns 400 when filePath missing', async () => {
    const res = await request(app)
      .post('/api/ingest')
      .send({});

    // Route is registered (not 404) and validates input (400)
    expect(res.status).toBe(400);
  });
});

describe('Error Logging: Console output', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('logs chat errors to console.error', async () => {
    const { generateQueryEmbedding } = require('../services/embedding');
    (generateQueryEmbedding as jest.Mock).mockRejectedValue(new Error('test error'));

    await request(app)
      .post('/api/chat')
      .send({ query: 'test' });

    expect(consoleSpy).toHaveBeenCalledWith('Chat error:', expect.any(Error));
  });

  it('logs ingest errors to console.error', async () => {
    const { parsePdfIntoChunks } = require('../services/pdf');
    const fs = require('fs');
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (parsePdfIntoChunks as jest.Mock).mockRejectedValue(new Error('parse error'));

    await request(app)
      .post('/api/ingest')
      .send({ filePath: '/tmp/test.pdf' });

    expect(consoleSpy).toHaveBeenCalledWith('Ingest error:', expect.any(Error));
  });
});
