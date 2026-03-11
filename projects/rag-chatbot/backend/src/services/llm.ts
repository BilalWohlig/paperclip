import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import type { Response } from 'express';
import type { ChunkResult } from './retrieval';

const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../service_key.json'), 'utf-8')
);

const ai = new GoogleGenAI({
  vertexai: true,
  project: serviceAccount.project_id,
  location: 'global',
  googleAuthOptions: { credentials: serviceAccount },
});

const SYSTEM_PROMPT = `You are a helpful assistant that answers questions based on the provided document context.

Your answers must:
- Be grounded in the retrieved context passages provided
- Cite relevant information accurately
- Acknowledge when the context does not contain enough information to fully answer
- Be concise and clear

Do not make up information that is not present in the context.`;

/**
 * Stream a Gemini response given a user query and retrieved context chunks.
 * Writes SSE events directly to the Express response object.
 *
 * SSE event format:
 *   data: {"type": "chunk", "content": "<token>"}
 *   data: {"type": "sources", "sources": [...]}
 *   data: {"type": "done"}
 */
export async function streamChatResponse(
  query: string,
  chunks: ChunkResult[],
  res: Response
): Promise<void> {
  // Build context from retrieved chunks
  const contextText = chunks
    .map(
      (chunk, i) =>
        `[Context ${i + 1}${chunk.sourceFile ? ` from ${chunk.sourceFile}` : ''}]:\n${chunk.content}`
    )
    .join('\n\n---\n\n');

  const userMessage = `Context from documents:\n\n${contextText}\n\n---\n\nQuestion: ${query}`;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send sources first so the client can display them while the answer streams
  const sourcePayload = chunks.map((c) => ({
    content: c.content,
    chunkIndex: c.chunkIndex,
    sourceFile: c.sourceFile,
    similarity: c.similarity,
  }));
  res.write(`data: ${JSON.stringify({ type: 'sources', sources: sourcePayload })}\n\n`);

  // Stream tokens from Gemini
  const response = await ai.models.generateContentStream({
    model: 'gemini-3-flash-preview',
    contents: userMessage,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      maxOutputTokens: 1024,
    },
  });

  for await (const chunk of response) {
    if (chunk.text) {
      res.write(
        `data: ${JSON.stringify({ type: 'chunk', content: chunk.text })}\n\n`
      );
    }
  }

  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  res.end();
}
