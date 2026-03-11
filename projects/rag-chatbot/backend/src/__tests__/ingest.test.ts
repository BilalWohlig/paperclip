/**
 * Unit tests for src/routes/ingest.ts
 *
 * Mocks: embedding service, pdf service, pg pool, fs.existsSync.
 */

import express from 'express';
import request from 'supertest';

// ---- module mocks (hoisted) ----

// Create existsSync mock inside the factory to avoid TDZ issues with hoisting
jest.mock('fs', () => {
  const actual = jest.requireActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: jest.fn(),
  };
});

jest.mock('../services/embedding', () => ({
  generateEmbeddings: jest.fn(),
}));

jest.mock('../services/pdf', () => ({
  parsePdfIntoChunks: jest.fn(),
}));

const mockPoolQuery = jest.fn();
jest.mock('../db/client', () => ({
  __esModule: true,
  default: { query: mockPoolQuery },
}));

// ---- imports after mocks ----

import * as fs from 'fs';
import { generateEmbeddings } from '../services/embedding';
import { parsePdfIntoChunks } from '../services/pdf';
import ingestRouter from '../routes/ingest';

const mockExistsSync = fs.existsSync as jest.Mock;
const mockGenerateEmbeddings = generateEmbeddings as jest.Mock;
const mockParsePdfIntoChunks = parsePdfIntoChunks as jest.Mock;

// Build a minimal express app for testing
const app = express();
app.use(express.json());
app.use('/api/ingest', ingestRouter);

describe('POST /api/ingest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when filePath is missing', async () => {
    const res = await request(app).post('/api/ingest').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/filePath is required/i);
  });

  it('returns 400 when filePath is not a string', async () => {
    const res = await request(app).post('/api/ingest').send({ filePath: 123 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/filePath is required/i);
  });

  it('returns 404 when the file does not exist', async () => {
    mockExistsSync.mockReturnValue(false);

    const res = await request(app)
      .post('/api/ingest')
      .send({ filePath: '/nonexistent/file.pdf' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/file not found/i);
  });

  it('returns 422 when the PDF contains no text content', async () => {
    mockExistsSync.mockReturnValue(true);
    mockParsePdfIntoChunks.mockResolvedValue([]); // empty chunks

    const res = await request(app)
      .post('/api/ingest')
      .send({ filePath: '/tmp/empty.pdf' });

    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/no text content/i);
  });

  it('returns 500 when embedding generation fails', async () => {
    mockExistsSync.mockReturnValue(true);
    mockParsePdfIntoChunks.mockResolvedValue([{ content: 'chunk 1', chunkIndex: 0 }]);
    mockGenerateEmbeddings.mockRejectedValue(new Error('embedding API error'));

    const res = await request(app)
      .post('/api/ingest')
      .send({ filePath: '/tmp/test.pdf' });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/ingestion failed/i);
  });

  it('returns 200 with inserted count for a valid filePath', async () => {
    mockExistsSync.mockReturnValue(true);

    const chunks = [
      { content: 'chunk 1', chunkIndex: 0 },
      { content: 'chunk 2', chunkIndex: 1 },
    ];
    mockParsePdfIntoChunks.mockResolvedValue(chunks);
    mockGenerateEmbeddings.mockResolvedValue([
      Array(3072).fill(0.1),
      Array(3072).fill(0.2),
    ]);
    mockPoolQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    const res = await request(app)
      .post('/api/ingest')
      .send({ filePath: '/tmp/test.pdf' });

    expect(res.status).toBe(200);
    expect(res.body.chunks).toBe(2);
    expect(mockPoolQuery).toHaveBeenCalledTimes(2);
  });
});
