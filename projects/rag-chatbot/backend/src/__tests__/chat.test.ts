/**
 * Unit tests for src/routes/chat.ts
 *
 * Mocks: embedding service, retrieval service, llm service.
 * SSE streaming is tested by collecting the raw response body.
 */

import express from 'express';
import request from 'supertest';

// ---- module mocks ----

jest.mock('../services/embedding', () => ({
  generateQueryEmbedding: jest.fn(),
}));

jest.mock('../services/retrieval', () => ({
  retrieveTopChunks: jest.fn(),
}));

jest.mock('../services/llm', () => ({
  streamChatResponse: jest.fn(),
}));

// ---- imports after mocks ----

import { generateQueryEmbedding } from '../services/embedding';
import { retrieveTopChunks } from '../services/retrieval';
import { streamChatResponse } from '../services/llm';
import chatRouter from '../routes/chat';

const mockGenerateQueryEmbedding = generateQueryEmbedding as jest.Mock;
const mockRetrieveTopChunks = retrieveTopChunks as jest.Mock;
const mockStreamChatResponse = streamChatResponse as jest.Mock;

// Build minimal express app
const app = express();
app.use(express.json());
app.use('/api/chat', chatRouter);

describe('POST /api/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when query is missing', async () => {
    const res = await request(app).post('/api/chat').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/query is required/i);
  });

  it('returns 400 when query is an empty string', async () => {
    const res = await request(app).post('/api/chat').send({ query: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/query is required/i);
  });

  it('returns an SSE stream with no-documents message when chunks array is empty', async () => {
    const fakeEmbedding = Array(3072).fill(0.1);

    mockGenerateQueryEmbedding.mockResolvedValue(fakeEmbedding);
    mockRetrieveTopChunks.mockResolvedValue([]); // no documents ingested

    const res = await request(app)
      .post('/api/chat')
      .send({ query: 'What is RAG?' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);

    const body = res.text;
    expect(body).toContain('"type":"sources"');
    expect(body).toContain('"sources":[]');
    expect(body).toContain('"type":"chunk"');
    expect(body).toContain('No documents have been ingested yet');
    expect(body).toContain('"type":"done"');
    // streamChatResponse should NOT be called when there are no chunks
    expect(mockStreamChatResponse).not.toHaveBeenCalled();
  });

  it('returns 500 JSON when embedding throws before headers are sent', async () => {
    mockGenerateQueryEmbedding.mockRejectedValue(new Error('embedding service down'));

    const res = await request(app)
      .post('/api/chat')
      .send({ query: 'What is RAG?' });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/chat failed/i);
  });

  it('produces an SSE stream with sources, chunks, and done when chunks exist', async () => {
    const fakeEmbedding = Array(3072).fill(0.1);
    const fakeChunks = [
      { id: 1, content: 'relevant text', sourceFile: 'doc.pdf', chunkIndex: 0, similarity: 0.9 },
    ];

    mockGenerateQueryEmbedding.mockResolvedValue(fakeEmbedding);
    mockRetrieveTopChunks.mockResolvedValue(fakeChunks);

    // Simulate streamChatResponse writing SSE events and ending the response
    mockStreamChatResponse.mockImplementation(
      async (_query: string, _chunks: unknown[], res: express.Response) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        res.write(`data: ${JSON.stringify({ type: 'sources', sources: fakeChunks })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: 'Answer.' })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
      }
    );

    const res = await request(app)
      .post('/api/chat')
      .send({ query: 'What is RAG?' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);

    const body = res.text;
    expect(body).toContain('"type":"sources"');
    expect(body).toContain('"type":"chunk"');
    expect(body).toContain('"type":"done"');

    expect(mockGenerateQueryEmbedding).toHaveBeenCalledWith('What is RAG?');
    expect(mockRetrieveTopChunks).toHaveBeenCalledWith(fakeEmbedding, 5);
    expect(mockStreamChatResponse).toHaveBeenCalled();
  });
});
