/**
 * Unit tests for src/services/llm.ts
 *
 * Mocks: @google/genai, fs (to avoid reading service_key.json).
 * Tests: streamChatResponse — SSE output, sources event, token chunks, done event.
 */

// Mock fs to intercept service_key.json read at module load time
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

// Mock @google/genai
const mockGenerateContentStream = jest.fn();
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      generateContentStream: mockGenerateContentStream,
    },
  })),
}));

import express from 'express';
import request from 'supertest';
import { streamChatResponse } from '../services/llm';
import type { ChunkResult } from '../services/retrieval';

// Minimal express app that delegates to streamChatResponse
const app = express();
app.use(express.json());
app.post('/test-stream', async (req, res) => {
  const { query, chunks } = req.body as { query: string; chunks: ChunkResult[] };
  await streamChatResponse(query, chunks, res);
});

// Helper to build an async iterable of fake streaming chunks
function makeAsyncIterable(items: Array<{ text?: string }>): AsyncIterable<{ text?: string }> {
  return {
    [Symbol.asyncIterator]() {
      let index = 0;
      return {
        async next() {
          if (index < items.length) {
            return { value: items[index++], done: false };
          }
          return { value: undefined as unknown as { text?: string }, done: true };
        },
      };
    },
  };
}

const fakeChunks: ChunkResult[] = [
  { id: 1, content: 'Context A', sourceFile: 'doc.pdf', chunkIndex: 0, similarity: 0.9 },
  { id: 2, content: 'Context B', sourceFile: null, chunkIndex: 1, similarity: 0.7 },
];

describe('streamChatResponse', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends sources event followed by chunk events and done event', async () => {
    mockGenerateContentStream.mockResolvedValue(
      makeAsyncIterable([
        { text: 'Hello ' },
        { text: 'world' },
      ])
    );

    const res = await request(app)
      .post('/test-stream')
      .send({ query: 'What is A?', chunks: fakeChunks });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);

    const body = res.text;
    // Sources event comes first
    const sourcesIndex = body.indexOf('"type":"sources"');
    const chunkIndex = body.indexOf('"type":"chunk"');
    const doneIndex = body.indexOf('"type":"done"');

    expect(sourcesIndex).toBeGreaterThanOrEqual(0);
    expect(chunkIndex).toBeGreaterThan(sourcesIndex);
    expect(doneIndex).toBeGreaterThan(chunkIndex);
  });

  it('sources event includes all chunk metadata', async () => {
    mockGenerateContentStream.mockResolvedValue(makeAsyncIterable([]));

    const res = await request(app)
      .post('/test-stream')
      .send({ query: 'test', chunks: fakeChunks });

    const body = res.text;
    // Parse the sources line
    const lines = body.split('\n').filter((l) => l.startsWith('data:'));
    const sourcesLine = lines.find((l) => l.includes('"type":"sources"'));
    expect(sourcesLine).toBeDefined();

    const parsed = JSON.parse(sourcesLine!.replace('data: ', ''));
    expect(parsed.sources).toHaveLength(2);
    expect(parsed.sources[0]).toMatchObject({
      content: 'Context A',
      sourceFile: 'doc.pdf',
      chunkIndex: 0,
      similarity: 0.9,
    });
    expect(parsed.sources[1].sourceFile).toBeNull();
  });

  it('emits chunk events for each token returned by the model', async () => {
    mockGenerateContentStream.mockResolvedValue(
      makeAsyncIterable([{ text: 'Token1' }, { text: 'Token2' }, { text: 'Token3' }])
    );

    const res = await request(app)
      .post('/test-stream')
      .send({ query: 'tell me', chunks: fakeChunks });

    const body = res.text;
    const lines = body.split('\n').filter((l) => l.startsWith('data:'));
    const chunkLines = lines.filter((l) => l.includes('"type":"chunk"'));

    expect(chunkLines).toHaveLength(3);
    const contents = chunkLines.map((l) => JSON.parse(l.replace('data: ', '')).content);
    expect(contents).toEqual(['Token1', 'Token2', 'Token3']);
  });

  it('skips model tokens that have no text property', async () => {
    mockGenerateContentStream.mockResolvedValue(
      makeAsyncIterable([
        { text: 'Real token' },
        {},            // no text — should be skipped
        { text: '' },  // empty text — should be skipped
      ])
    );

    const res = await request(app)
      .post('/test-stream')
      .send({ query: 'q', chunks: fakeChunks });

    const lines = res.text.split('\n').filter((l) => l.startsWith('data:'));
    const chunkLines = lines.filter((l) => l.includes('"type":"chunk"'));

    // Only the truthy text should emit a chunk event
    expect(chunkLines).toHaveLength(1);
    expect(JSON.parse(chunkLines[0].replace('data: ', '')).content).toBe('Real token');
  });

  it('works correctly with an empty chunks array (no documents)', async () => {
    mockGenerateContentStream.mockResolvedValue(makeAsyncIterable([{ text: 'General answer' }]));

    const res = await request(app)
      .post('/test-stream')
      .send({ query: 'anything?', chunks: [] });

    expect(res.status).toBe(200);
    expect(res.text).toContain('"type":"sources"');
    expect(res.text).toContain('"sources":[]');
    expect(res.text).toContain('"type":"done"');
  });

  it('calls generateContentStream with the correct model', async () => {
    mockGenerateContentStream.mockResolvedValue(makeAsyncIterable([]));

    await request(app)
      .post('/test-stream')
      .send({ query: 'q', chunks: fakeChunks });

    expect(mockGenerateContentStream).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-3-flash-preview' })
    );
  });
});
