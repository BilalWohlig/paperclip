/**
 * Integration tests for API routes with real database
 *
 * Tests the ingest and chat routes against a real PostgreSQL + pgvector database.
 * Skipped if DATABASE_URL is not set or database is unreachable.
 *
 * NOTE: Embedding and LLM services are still mocked since they require
 * external API credentials. The database interactions are real.
 *
 * Cleanup: All test data uses source_file='__test_api_integration__'
 * and is deleted in afterAll.
 */

import { Pool } from 'pg';
import express from 'express';
import request from 'supertest';

const DATABASE_URL = process.env.DATABASE_URL;
const TEST_SOURCE_FILE = '__test_api_integration__';

let realPool: Pool;
let dbAvailable = false;

// ---- Mock only external services, keep real DB ----

jest.mock('fs', () => {
  const actual = jest.requireActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: jest.fn().mockReturnValue(true),
    readFileSync: (filePath: unknown, encoding?: unknown) => {
      if (String(filePath).includes('service_key.json')) {
        return JSON.stringify({ project_id: 'test-project' });
      }
      return actual.readFileSync(filePath as string, encoding as BufferEncoding);
    },
  };
});

jest.mock('../../services/embedding', () => ({
  generateEmbeddings: jest.fn(),
  generateQueryEmbedding: jest.fn(),
}));

jest.mock('../../services/llm', () => ({
  streamChatResponse: jest.fn(),
}));

jest.mock('../../services/pdf', () => ({
  parsePdfIntoChunks: jest.fn(),
}));

// ---- Do NOT mock db/client — use real database ----

import { generateEmbeddings, generateQueryEmbedding } from '../../services/embedding';
import { streamChatResponse } from '../../services/llm';
import { parsePdfIntoChunks } from '../../services/pdf';
import ingestRouter from '../../routes/ingest';
import chatRouter from '../../routes/chat';

const mockGenerateEmbeddings = generateEmbeddings as jest.Mock;
const mockGenerateQueryEmbedding = generateQueryEmbedding as jest.Mock;
const mockStreamChatResponse = streamChatResponse as jest.Mock;
const mockParsePdfIntoChunks = parsePdfIntoChunks as jest.Mock;

const app = express();
app.use(express.json());
app.use('/api/ingest', ingestRouter);
app.use('/api/chat', chatRouter);

beforeAll(async () => {
  if (!DATABASE_URL) {
    console.log('Skipping API integration tests: DATABASE_URL not set');
    return;
  }

  realPool = new Pool({ connectionString: DATABASE_URL });

  try {
    const client = await realPool.connect();
    const extResult = await client.query(
      "SELECT 1 FROM pg_extension WHERE extname = 'vector'"
    );
    const tableResult = await client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_name = 'document_chunks'"
    );
    client.release();

    if (extResult.rows.length > 0 && tableResult.rows.length > 0) {
      dbAvailable = true;
    } else {
      console.log('Skipping API integration tests: pgvector or table not found');
    }
  } catch (err) {
    console.log('Skipping API integration tests: database unreachable -', (err as Error).message);
  }
});

afterAll(async () => {
  if (realPool && dbAvailable) {
    await realPool.query(
      'DELETE FROM document_chunks WHERE source_file = $1',
      [TEST_SOURCE_FILE]
    );
    await realPool.end();
  }
});

function skipIfNoDb() {
  return !dbAvailable;
}

describe('Integration: Ingest route with real DB', () => {
  beforeEach(() => jest.clearAllMocks());

  it('inserts chunks into real database via ingest route', async () => {
    if (skipIfNoDb()) return;

    const chunks = [
      { content: 'Integration test chunk 1', chunkIndex: 0 },
      { content: 'Integration test chunk 2', chunkIndex: 1 },
    ];
    mockParsePdfIntoChunks.mockResolvedValue(chunks);

    const embedding = Array.from({ length: 3072 }, () => Math.random() * 0.01);
    mockGenerateEmbeddings.mockResolvedValue([embedding, embedding]);

    const res = await request(app)
      .post('/api/ingest')
      .send({ filePath: '/tmp/test-integration.pdf' });

    expect(res.status).toBe(200);
    expect(res.body.chunks).toBe(2);

    // Verify in real database
    const dbResult = await realPool.query(
      'SELECT content FROM document_chunks WHERE source_file = $1 ORDER BY chunk_index',
      ['test-integration.pdf']
    );
    expect(dbResult.rows.length).toBe(2);
    expect(dbResult.rows[0].content).toBe('Integration test chunk 1');

    // Cleanup
    await realPool.query(
      "DELETE FROM document_chunks WHERE source_file = 'test-integration.pdf'"
    );
  });
});

describe('Integration: Chat route with real DB', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retrieves chunks from real database during chat', async () => {
    if (skipIfNoDb()) return;

    // Pre-insert test data
    const embedding = Array.from({ length: 3072 }, () => 0.1);
    const vectorLiteral = `[${embedding.join(',')}]`;

    await realPool.query(
      `INSERT INTO document_chunks (content, embedding, source_file, chunk_index)
       VALUES ($1, $2::vector, $3, $4)`,
      ['Real DB test content for chat', vectorLiteral, TEST_SOURCE_FILE, 0]
    );

    // Mock embedding service to return same vector
    mockGenerateQueryEmbedding.mockResolvedValue(embedding);

    // Mock LLM to write SSE response
    mockStreamChatResponse.mockImplementation(
      async (_q: string, chunks: unknown[], res: express.Response) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.flushHeaders();
        res.write(`data: ${JSON.stringify({ type: 'sources', sources: chunks })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'chunk', content: 'Answer from LLM' })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
      }
    );

    const res = await request(app)
      .post('/api/chat')
      .send({ query: 'test query' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('"type":"sources"');
    // The real retrieval service should have found our test chunk
    expect(mockStreamChatResponse).toHaveBeenCalled();

    // Cleanup
    await realPool.query(
      'DELETE FROM document_chunks WHERE source_file = $1',
      [TEST_SOURCE_FILE]
    );
  });
});
