CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS document_chunks (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(3072),
  source_file TEXT,
  chunk_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index: better recall than IVFFlat at all dataset sizes, no probe tuning needed.
-- IVFFlat requires probes=lists to avoid missing results on small datasets (<1000 rows).
-- pgvector HNSW supports max 2000 dims for vector; use halfvec cast for 3072-dim vectors.
CREATE INDEX ON document_chunks USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);
