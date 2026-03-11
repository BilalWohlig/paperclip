import { Router, Request, Response } from 'express';
import { generateQueryEmbedding } from '../services/embedding';
import { retrieveTopChunks } from '../services/retrieval';
import { streamChatResponse } from '../services/llm';

const router = Router();

interface ChatBody {
  query: string;
}

router.post('/', async (req: Request<{}, {}, ChatBody>, res: Response) => {
  const { query } = req.body;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    res.status(400).json({ error: 'query is required and must be a non-empty string' });
    return;
  }

  try {
    // Embed the user query
    const queryEmbedding = await generateQueryEmbedding(query.trim());

    // Retrieve top-5 relevant chunks
    const chunks = await retrieveTopChunks(queryEmbedding, 5);

    if (chunks.length === 0) {
      // No documents ingested yet — return a friendly SSE response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      res.write(
        `data: ${JSON.stringify({ type: 'sources', sources: [] })}\n\n`
      );
      res.write(
        `data: ${JSON.stringify({
          type: 'chunk',
          content:
            'No documents have been ingested yet. Please call POST /api/ingest with a PDF file first.',
        })}\n\n`
      );
      res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
      res.end();
      return;
    }

    // Stream Claude response with retrieved context
    await streamChatResponse(query.trim(), chunks, res);
  } catch (err) {
    console.error('Chat error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Chat failed', details: String(err) });
    } else {
      // SSE already started — send error event and close
      res.write(
        `data: ${JSON.stringify({ type: 'error', message: String(err) })}\n\n`
      );
      res.end();
    }
  }
});

export default router;
