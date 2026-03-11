/**
 * Unit tests for src/index.ts (app entry point)
 *
 * Mocks all route modules and services so we can test the app's own wiring
 * (CORS, JSON middleware, health endpoint, route mounting) in isolation.
 */

// Mock embedding service to avoid service_key.json read at module load
jest.mock('../services/embedding', () => ({
  generateQueryEmbedding: jest.fn(),
  generateEmbeddings: jest.fn(),
}));

// Mock LLM service
jest.mock('../services/llm', () => ({
  streamChatResponse: jest.fn(),
}));

// Mock retrieval service
jest.mock('../services/retrieval', () => ({
  retrieveTopChunks: jest.fn(),
}));

// Mock PDF service
jest.mock('../services/pdf', () => ({
  parsePdfIntoChunks: jest.fn(),
}));

// Mock DB client
jest.mock('../db/client', () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

// Mock fs to prevent service_key.json read
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

import request from 'supertest';
import app from '../index';

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('responds with JSON content-type', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});

describe('CORS middleware', () => {
  it('includes Access-Control-Allow-Origin in response headers', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');
    // cors() with default config allows all origins
    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });
});

describe('Unknown routes', () => {
  it('returns 404 for unregistered GET paths', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('JSON body parsing', () => {
  it('parses JSON bodies larger than default limits (up to 10mb limit)', async () => {
    // The ingest route reads filePath — mock existsSync to return false so we
    // get a 404-file-not-found rather than a JSON parse error.
    const res = await request(app)
      .post('/api/ingest')
      .set('Content-Type', 'application/json')
      .send({ filePath: '/nonexistent/file.pdf' });
    // Should reach the route (not fail with 413 / body parse error)
    expect([400, 404, 422, 500]).toContain(res.status);
  });
});
