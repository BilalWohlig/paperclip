/**
 * End-to-End tests for RAG Chatbot
 *
 * Tests the complete request/response flow through the running server.
 * These tests use the full Express app with mocked external services
 * (embedding API, LLM API) to validate the entire request pipeline.
 *
 * For tests with a real database, see integration/ tests.
 */

// ---- module mocks ----

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

jest.mock('../../services/embedding', () => ({
  generateQueryEmbedding: jest.fn(),
  generateEmbeddings: jest.fn(),
}));

jest.mock('../../services/retrieval', () => ({
  retrieveTopChunks: jest.fn(),
}));

jest.mock('../../services/llm', () => ({
  streamChatResponse: jest.fn(),
}));

jest.mock('../../services/pdf', () => ({
  parsePdfIntoChunks: jest.fn(),
}));

const mockPoolQuery = jest.fn();
jest.mock('../../db/client', () => ({
  __esModule: true,
  default: { query: mockPoolQuery },
}));

// ---- imports after mocks ----

import * as fs from 'fs';
import request from 'supertest';
import express from 'express';
import { generateQueryEmbedding, generateEmbeddings } from '../../services/embedding';
import { retrieveTopChunks } from '../../services/retrieval';
import { streamChatResponse } from '../../services/llm';
import { parsePdfIntoChunks } from '../../services/pdf';

const mockExistsSync = fs.existsSync as jest.Mock;
const mockGenerateQueryEmbedding = generateQueryEmbedding as jest.Mock;
const mockGenerateEmbeddings = generateEmbeddings as jest.Mock;
const mockRetrieveTopChunks = retrieveTopChunks as jest.Mock;
const mockStreamChatResponse = streamChatResponse as jest.Mock;
const mockParsePdfIntoChunks = parsePdfIntoChunks as jest.Mock;

// Use the real app entry point
import app from '../../index';

describe('E2E: Complete Chat Flow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('full chat flow: query → embedding → retrieval → LLM → SSE response', async () => {
    const fakeEmbedding = Array(3072).fill(0.1);
    const fakeChunks = [
      { id: 1, content: 'RAG stands for Retrieval-Augmented Generation', sourceFile: 'rag.pdf', chunkIndex: 0, similarity: 0.95 },
      { id: 2, content: 'It combines retrieval with generation', sourceFile: 'rag.pdf', chunkIndex: 1, similarity: 0.85 },
    ];

    mockGenerateQueryEmbedding.mockResolvedValue(fakeEmbedding);
    mockRetrieveTopChunks.mockResolvedValue(fakeChunks);
    mockStreamChatResponse.mockImplementation(
      async (query: string, chunks: unknown[], res: express.Response) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        res.write(`data: ${JSON.stringify({ type: 'sources', sources: chunks })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: 'RAG is ' })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: 'a technique.' })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
      }
    );

    const res = await request(app)
      .post('/api/chat')
      .send({ query: 'What is RAG?' });

    // Verify status and headers
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);

    // Parse SSE events
    const events = res.text
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => JSON.parse(line.replace('data: ', '')));

    // Verify event sequence
    expect(events[0].type).toBe('sources');
    expect(events[0].sources).toHaveLength(2);

    const chunkEvents = events.filter((e) => e.type === 'chunk');
    expect(chunkEvents).toHaveLength(2);
    expect(chunkEvents[0].content).toBe('RAG is ');
    expect(chunkEvents[1].content).toBe('a technique.');

    const doneEvent = events.find((e) => e.type === 'done');
    expect(doneEvent).toBeDefined();

    // Verify service calls
    expect(mockGenerateQueryEmbedding).toHaveBeenCalledWith('What is RAG?');
    expect(mockRetrieveTopChunks).toHaveBeenCalledWith(fakeEmbedding, 5);
    expect(mockStreamChatResponse).toHaveBeenCalledWith('What is RAG?', fakeChunks, expect.anything());
  });

  it('chat with no documents: returns friendly message', async () => {
    mockGenerateQueryEmbedding.mockResolvedValue(Array(3072).fill(0.1));
    mockRetrieveTopChunks.mockResolvedValue([]);

    const res = await request(app)
      .post('/api/chat')
      .send({ query: 'Tell me about the documents' });

    expect(res.status).toBe(200);

    const events = res.text
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => JSON.parse(line.replace('data: ', '')));

    expect(events[0].type).toBe('sources');
    expect(events[0].sources).toEqual([]);

    const chunkEvent = events.find((e) => e.type === 'chunk');
    expect(chunkEvent!.content).toContain('No documents have been ingested yet');

    expect(events[events.length - 1].type).toBe('done');
    expect(mockStreamChatResponse).not.toHaveBeenCalled();
  });
});

describe('E2E: Complete Ingest Flow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('full ingest flow: file → parse → embed → store', async () => {
    mockExistsSync.mockReturnValue(true);
    mockParsePdfIntoChunks.mockResolvedValue([
      { content: 'First chunk of the document', chunkIndex: 0 },
      { content: 'Second chunk of the document', chunkIndex: 1 },
      { content: 'Third chunk of the document', chunkIndex: 2 },
    ]);
    mockGenerateEmbeddings.mockResolvedValue([
      Array(3072).fill(0.1),
      Array(3072).fill(0.2),
      Array(3072).fill(0.3),
    ]);
    mockPoolQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    const res = await request(app)
      .post('/api/ingest')
      .send({ filePath: '/documents/report.pdf' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: 'Ingestion complete',
      chunks: 3,
      sourceFile: 'report.pdf',
    });

    // Verify embedding was called with correct texts
    expect(mockGenerateEmbeddings).toHaveBeenCalledWith([
      'First chunk of the document',
      'Second chunk of the document',
      'Third chunk of the document',
    ]);

    // Verify 3 DB inserts were made
    expect(mockPoolQuery).toHaveBeenCalledTimes(3);
  });

  it('ingest with large document: batches embeddings in groups of 100', async () => {
    mockExistsSync.mockReturnValue(true);

    // Create 150 chunks to test batching
    const chunks = Array.from({ length: 150 }, (_, i) => ({
      content: `Chunk ${i}`,
      chunkIndex: i,
    }));
    mockParsePdfIntoChunks.mockResolvedValue(chunks);

    // First batch: 100 chunks, second batch: 50 chunks
    mockGenerateEmbeddings
      .mockResolvedValueOnce(Array(100).fill(Array(3072).fill(0.1)))
      .mockResolvedValueOnce(Array(50).fill(Array(3072).fill(0.1)));
    mockPoolQuery.mockResolvedValue({ rows: [], rowCount: 1 });

    const res = await request(app)
      .post('/api/ingest')
      .send({ filePath: '/documents/large.pdf' });

    expect(res.status).toBe(200);
    expect(res.body.chunks).toBe(150);

    // Two batches of embeddings
    expect(mockGenerateEmbeddings).toHaveBeenCalledTimes(2);
    // 150 individual DB inserts
    expect(mockPoolQuery).toHaveBeenCalledTimes(150);
  });
});

describe('E2E: Health Check', () => {
  it('health endpoint returns status ok through full middleware stack', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });
});

describe('E2E: Error Scenarios', () => {
  beforeEach(() => jest.clearAllMocks());

  it('chat validation → embedding failure → proper error', async () => {
    // Step 1: Validation failure
    const validationRes = await request(app)
      .post('/api/chat')
      .send({});
    expect(validationRes.status).toBe(400);

    // Step 2: Service failure
    mockGenerateQueryEmbedding.mockRejectedValue(new Error('API key invalid'));
    const serviceRes = await request(app)
      .post('/api/chat')
      .send({ query: 'test' });
    expect(serviceRes.status).toBe(500);
    expect(serviceRes.body.details).toContain('API key invalid');
  });

  it('ingest validation → file check → parse failure → proper error chain', async () => {
    // Step 1: Missing filePath
    const missing = await request(app)
      .post('/api/ingest')
      .send({});
    expect(missing.status).toBe(400);

    // Step 2: File not found
    mockExistsSync.mockReturnValue(false);
    const notFound = await request(app)
      .post('/api/ingest')
      .send({ filePath: '/missing.pdf' });
    expect(notFound.status).toBe(404);

    // Step 3: Empty PDF
    mockExistsSync.mockReturnValue(true);
    mockParsePdfIntoChunks.mockResolvedValue([]);
    const emptyPdf = await request(app)
      .post('/api/ingest')
      .send({ filePath: '/empty.pdf' });
    expect(emptyPdf.status).toBe(422);

    // Step 4: Internal error
    mockParsePdfIntoChunks.mockRejectedValue(new Error('corrupt'));
    const internal = await request(app)
      .post('/api/ingest')
      .send({ filePath: '/corrupt.pdf' });
    expect(internal.status).toBe(500);
  });
});

describe('E2E: Cross-cutting Concerns', () => {
  it('CORS headers present on all responses', async () => {
    const healthRes = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');

    const chatRes = await request(app)
      .post('/api/chat')
      .set('Origin', 'http://localhost:5173')
      .send({});

    expect(healthRes.headers['access-control-allow-origin']).toBeDefined();
    expect(chatRes.headers['access-control-allow-origin']).toBeDefined();
  });

  it('handles multiple rapid sequential requests', async () => {
    mockGenerateQueryEmbedding.mockResolvedValue(Array(3072).fill(0.1));
    mockRetrieveTopChunks.mockResolvedValue([]);

    for (let i = 0; i < 10; i++) {
      const res = await request(app)
        .post('/api/chat')
        .send({ query: `rapid query ${i}` });
      expect(res.status).toBe(200);
    }
  });
});
