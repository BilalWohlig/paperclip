/**
 * Integration tests for database layer
 *
 * These tests connect to a REAL PostgreSQL database with pgvector.
 * They are SKIPPED if DATABASE_URL is not set or the database is unreachable.
 *
 * Test data cleanup: All test data uses source_file='__test_integration__'
 * and is deleted in afterAll to keep the database clean.
 */

import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
const TEST_SOURCE_FILE = '__test_integration__';

let pool: Pool;
let dbAvailable = false;

beforeAll(async () => {
  if (!DATABASE_URL) {
    console.log('Skipping DB integration tests: DATABASE_URL not set');
    return;
  }

  pool = new Pool({ connectionString: DATABASE_URL });

  try {
    const client = await pool.connect();
    // Verify pgvector extension
    const extResult = await client.query(
      "SELECT 1 FROM pg_extension WHERE extname = 'vector'"
    );
    if (extResult.rows.length === 0) {
      console.log('Skipping DB integration tests: pgvector extension not installed');
      client.release();
      return;
    }

    // Verify document_chunks table exists
    const tableResult = await client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_name = 'document_chunks'"
    );
    if (tableResult.rows.length === 0) {
      console.log('Skipping DB integration tests: document_chunks table not found');
      client.release();
      return;
    }

    client.release();
    dbAvailable = true;
  } catch (err) {
    console.log('Skipping DB integration tests: database unreachable -', (err as Error).message);
  }
});

afterAll(async () => {
  if (pool && dbAvailable) {
    // Clean up ALL test data
    await pool.query(
      'DELETE FROM document_chunks WHERE source_file = $1',
      [TEST_SOURCE_FILE]
    );
    await pool.end();
  }
});

function skipIfNoDb() {
  if (!dbAvailable) {
    return true;
  }
  return false;
}

describe('Integration: Database Connection', () => {
  it('connects to PostgreSQL successfully', async () => {
    if (skipIfNoDb()) return;

    const client = await pool.connect();
    const result = await client.query('SELECT 1 AS connected');
    client.release();

    expect(result.rows[0].connected).toBe(1);
  });

  it('pgvector extension is installed', async () => {
    if (skipIfNoDb()) return;

    const result = await pool.query(
      "SELECT extversion FROM pg_extension WHERE extname = 'vector'"
    );

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].extversion).toBeDefined();
  });

  it('document_chunks table exists with correct schema', async () => {
    if (skipIfNoDb()) return;

    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'document_chunks'
      ORDER BY ordinal_position
    `);

    const columns = result.rows.map((r) => r.column_name);
    expect(columns).toContain('id');
    expect(columns).toContain('content');
    expect(columns).toContain('embedding');
    expect(columns).toContain('source_file');
    expect(columns).toContain('chunk_index');
    expect(columns).toContain('created_at');
  });
});

describe('Integration: CRUD Operations', () => {
  let insertedIds: number[] = [];

  afterEach(async () => {
    if (!dbAvailable) return;

    // Clean up inserted test data
    if (insertedIds.length > 0) {
      await pool.query(
        'DELETE FROM document_chunks WHERE id = ANY($1)',
        [insertedIds]
      );
      insertedIds = [];
    }
  });

  it('inserts a document chunk with embedding', async () => {
    if (skipIfNoDb()) return;

    const embedding = Array.from({ length: 3072 }, () => Math.random() * 0.01);
    const vectorLiteral = `[${embedding.join(',')}]`;

    const result = await pool.query(
      `INSERT INTO document_chunks (content, embedding, source_file, chunk_index)
       VALUES ($1, $2::vector, $3, $4) RETURNING id`,
      ['Integration test content', vectorLiteral, TEST_SOURCE_FILE, 0]
    );

    expect(result.rows[0].id).toBeDefined();
    insertedIds.push(result.rows[0].id);
  });

  it('retrieves inserted chunks by source file', async () => {
    if (skipIfNoDb()) return;

    const embedding = Array.from({ length: 3072 }, () => Math.random() * 0.01);
    const vectorLiteral = `[${embedding.join(',')}]`;

    const insertResult = await pool.query(
      `INSERT INTO document_chunks (content, embedding, source_file, chunk_index)
       VALUES ($1, $2::vector, $3, $4) RETURNING id`,
      ['Retrieval test content', vectorLiteral, TEST_SOURCE_FILE, 0]
    );
    insertedIds.push(insertResult.rows[0].id);

    const selectResult = await pool.query(
      'SELECT content, source_file, chunk_index FROM document_chunks WHERE source_file = $1',
      [TEST_SOURCE_FILE]
    );

    expect(selectResult.rows.length).toBeGreaterThanOrEqual(1);
    const testRow = selectResult.rows.find((r) => r.content === 'Retrieval test content');
    expect(testRow).toBeDefined();
    expect(testRow!.source_file).toBe(TEST_SOURCE_FILE);
    expect(testRow!.chunk_index).toBe(0);
  });

  it('performs cosine similarity search', async () => {
    if (skipIfNoDb()) return;

    // Insert two chunks with different embeddings
    const embedding1 = Array.from({ length: 3072 }, () => 0.1);
    const embedding2 = Array.from({ length: 3072 }, () => -0.1);

    const res1 = await pool.query(
      `INSERT INTO document_chunks (content, embedding, source_file, chunk_index)
       VALUES ($1, $2::vector, $3, $4) RETURNING id`,
      ['Chunk A', `[${embedding1.join(',')}]`, TEST_SOURCE_FILE, 0]
    );
    insertedIds.push(res1.rows[0].id);

    const res2 = await pool.query(
      `INSERT INTO document_chunks (content, embedding, source_file, chunk_index)
       VALUES ($1, $2::vector, $3, $4) RETURNING id`,
      ['Chunk B', `[${embedding2.join(',')}]`, TEST_SOURCE_FILE, 1]
    );
    insertedIds.push(res2.rows[0].id);

    // Search with an embedding similar to embedding1
    const queryEmbedding = Array.from({ length: 3072 }, () => 0.1);
    const queryVector = `[${queryEmbedding.join(',')}]`;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ivfflat.probes = 10');
      const searchResult = await client.query(
        `SELECT id, content, source_file,
                1 - (embedding <=> $1::vector) AS similarity
         FROM document_chunks
         WHERE source_file = $2
         ORDER BY embedding <=> $1::vector
         LIMIT 2`,
        [queryVector, TEST_SOURCE_FILE]
      );
      await client.query('COMMIT');

      expect(searchResult.rows.length).toBe(2);
      // Chunk A should be more similar to the query
      expect(searchResult.rows[0].content).toBe('Chunk A');
      expect(parseFloat(searchResult.rows[0].similarity)).toBeGreaterThan(
        parseFloat(searchResult.rows[1].similarity)
      );
    } finally {
      client.release();
    }
  });

  it('deletes test data cleanly', async () => {
    if (skipIfNoDb()) return;

    const embedding = Array.from({ length: 3072 }, () => Math.random() * 0.01);
    const vectorLiteral = `[${embedding.join(',')}]`;

    const insertResult = await pool.query(
      `INSERT INTO document_chunks (content, embedding, source_file, chunk_index)
       VALUES ($1, $2::vector, $3, $4) RETURNING id`,
      ['To be deleted', vectorLiteral, TEST_SOURCE_FILE, 99]
    );
    const id = insertResult.rows[0].id;

    await pool.query('DELETE FROM document_chunks WHERE id = $1', [id]);

    const checkResult = await pool.query(
      'SELECT * FROM document_chunks WHERE id = $1',
      [id]
    );
    expect(checkResult.rows.length).toBe(0);
  });
});

describe('Integration: Transaction Handling', () => {
  it('rolls back on error within transaction', async () => {
    if (skipIfNoDb()) return;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const embedding = Array.from({ length: 3072 }, () => 0.01);
      const vectorLiteral = `[${embedding.join(',')}]`;

      await client.query(
        `INSERT INTO document_chunks (content, embedding, source_file, chunk_index)
         VALUES ($1, $2::vector, $3, $4)`,
        ['Should be rolled back', vectorLiteral, TEST_SOURCE_FILE, 999]
      );

      // Force rollback
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }

    // Verify the row was not committed
    const checkResult = await pool.query(
      "SELECT * FROM document_chunks WHERE source_file = $1 AND chunk_index = 999",
      [TEST_SOURCE_FILE]
    );
    expect(checkResult.rows.length).toBe(0);
  });
});

describe('Integration: Edge Cases', () => {
  let insertedIds: number[] = [];

  afterEach(async () => {
    if (!dbAvailable) return;
    if (insertedIds.length > 0) {
      await pool.query('DELETE FROM document_chunks WHERE id = ANY($1)', [insertedIds]);
      insertedIds = [];
    }
  });

  it('handles very long content text', async () => {
    if (skipIfNoDb()) return;

    const longContent = 'A'.repeat(50_000);
    const embedding = Array.from({ length: 3072 }, () => 0.01);
    const vectorLiteral = `[${embedding.join(',')}]`;

    const result = await pool.query(
      `INSERT INTO document_chunks (content, embedding, source_file, chunk_index)
       VALUES ($1, $2::vector, $3, $4) RETURNING id`,
      [longContent, vectorLiteral, TEST_SOURCE_FILE, 0]
    );
    insertedIds.push(result.rows[0].id);

    const selectResult = await pool.query(
      'SELECT length(content) as len FROM document_chunks WHERE id = $1',
      [result.rows[0].id]
    );
    expect(parseInt(selectResult.rows[0].len)).toBe(50_000);
  });

  it('handles special characters in content', async () => {
    if (skipIfNoDb()) return;

    const specialContent = "Test with 'quotes', \"doubles\", unicode: 日本語, emoji: 🤖, and null: \x00";
    const embedding = Array.from({ length: 3072 }, () => 0.01);
    const vectorLiteral = `[${embedding.join(',')}]`;

    const result = await pool.query(
      `INSERT INTO document_chunks (content, embedding, source_file, chunk_index)
       VALUES ($1, $2::vector, $3, $4) RETURNING id`,
      [specialContent, vectorLiteral, TEST_SOURCE_FILE, 0]
    );
    insertedIds.push(result.rows[0].id);

    const selectResult = await pool.query(
      'SELECT content FROM document_chunks WHERE id = $1',
      [result.rows[0].id]
    );
    expect(selectResult.rows[0].content).toContain("'quotes'");
    expect(selectResult.rows[0].content).toContain('日本語');
  });

  it('handles null source_file and chunk_index', async () => {
    if (skipIfNoDb()) return;

    const embedding = Array.from({ length: 3072 }, () => 0.01);
    const vectorLiteral = `[${embedding.join(',')}]`;

    const result = await pool.query(
      `INSERT INTO document_chunks (content, embedding, source_file, chunk_index)
       VALUES ($1, $2::vector, NULL, NULL) RETURNING id`,
      ['Null metadata test', vectorLiteral]
    );
    insertedIds.push(result.rows[0].id);

    // Also clean up by source_file filter won't catch this, so track by ID
    const selectResult = await pool.query(
      'SELECT source_file, chunk_index FROM document_chunks WHERE id = $1',
      [result.rows[0].id]
    );
    expect(selectResult.rows[0].source_file).toBeNull();
    expect(selectResult.rows[0].chunk_index).toBeNull();
  });
});
