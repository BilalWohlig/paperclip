-- Migration: Voyage AI (512-dim) → Vertex AI gemini-embedding-001 (3072-dim)
-- pgvector does not support in-place vector dimension changes.
-- Run this once before re-ingesting documents.

DELETE FROM document_chunks;
ALTER TABLE document_chunks DROP COLUMN embedding;
ALTER TABLE document_chunks ADD COLUMN embedding vector(3072);
DROP INDEX IF EXISTS document_chunks_embedding_idx;
-- pgvector HNSW supports max 2000 dims for vector; use halfvec cast for 3072-dim vectors.
CREATE INDEX ON document_chunks USING hnsw ((embedding::halfvec(3072)) halfvec_cosine_ops);
