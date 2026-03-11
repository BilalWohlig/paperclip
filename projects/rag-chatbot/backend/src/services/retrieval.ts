import pool from '../db/client';

export interface ChunkResult {
  id: number;
  content: string;
  sourceFile: string | null;
  chunkIndex: number | null;
  similarity: number;
}

/**
 * Find the top-k most similar chunks to the given embedding vector
 * using pgvector cosine similarity.
 */
export async function retrieveTopChunks(
  embedding: number[],
  topK: number = 5
): Promise<ChunkResult[]> {
  // pgvector cosine distance: 1 - cosine_similarity
  // Use <=> operator for cosine distance (lower = more similar)
  const vectorLiteral = `[${embedding.join(',')}]`;

  // Use a dedicated client so we can set ivfflat.probes before querying.
  // With lists=10 and the default probes=1, small datasets (<1000 rows) often
  // hit empty IVFFlat clusters and return 0 results. Setting probes=lists
  // ensures all clusters are searched.
  const client = await pool.connect();
  let rows: {
    id: number;
    content: string;
    source_file: string | null;
    chunk_index: number | null;
    similarity: number;
  }[];
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ivfflat.probes = 10');
    const result = await client.query<{
      id: number;
      content: string;
      source_file: string | null;
      chunk_index: number | null;
      similarity: number;
    }>(
      `SELECT id, content, source_file, chunk_index,
              1 - (embedding <=> $1::vector) AS similarity
       FROM document_chunks
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [vectorLiteral, topK]
    );
    rows = result.rows;
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    sourceFile: row.source_file,
    chunkIndex: row.chunk_index,
    similarity: parseFloat(String(row.similarity)),
  }));
}
