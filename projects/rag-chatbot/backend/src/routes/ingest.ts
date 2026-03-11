import { Router, Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { parsePdfIntoChunks } from '../services/pdf';
import { generateEmbeddings } from '../services/embedding';
import pool from '../db/client';

const router = Router();

interface IngestBody {
  filePath: string;
}

router.post('/', async (req: Request<{}, {}, IngestBody>, res: Response) => {
  const { filePath } = req.body;

  if (!filePath || typeof filePath !== 'string') {
    res.status(400).json({ error: 'filePath is required and must be a string' });
    return;
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    res.status(404).json({ error: `File not found: ${absolutePath}` });
    return;
  }

  try {
    console.log(`Ingesting: ${absolutePath}`);

    // Parse and chunk the PDF
    const chunks = await parsePdfIntoChunks(absolutePath);
    console.log(`Parsed ${chunks.length} chunks`);

    if (chunks.length === 0) {
      res.status(422).json({ error: 'No text content found in PDF' });
      return;
    }

    // Generate embeddings in batches of 100 (OpenAI rate-limit friendly)
    const BATCH_SIZE = 100;
    const sourceFile = path.basename(absolutePath);
    let totalInserted = 0;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map((c) => c.content);
      const embeddings = await generateEmbeddings(texts);

      // Insert each chunk+embedding into pgvector
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j];
        const embedding = embeddings[j];
        const vectorLiteral = `[${embedding.join(',')}]`;

        await pool.query(
          `INSERT INTO document_chunks (content, embedding, source_file, chunk_index)
           VALUES ($1, $2::vector, $3, $4)`,
          [chunk.content, vectorLiteral, sourceFile, chunk.chunkIndex]
        );
        totalInserted++;
      }

      console.log(`Inserted ${totalInserted}/${chunks.length} chunks`);
    }

    res.json({
      message: 'Ingestion complete',
      chunks: totalInserted,
      sourceFile,
    });
  } catch (err) {
    console.error('Ingest error:', err);
    res.status(500).json({ error: 'Ingestion failed', details: String(err) });
  }
});

export default router;
