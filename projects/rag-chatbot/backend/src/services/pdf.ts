import * as fs from 'fs';
import pdfParse from 'pdf-parse';

export interface Chunk {
  content: string;
  chunkIndex: number;
}

const CHUNK_TOKENS = 500;   // approximate target tokens per chunk
const OVERLAP_TOKENS = 50;  // approximate token overlap between chunks

// Rough token estimate: ~4 characters per token for English text
const CHARS_PER_TOKEN = 4;
const CHUNK_CHARS = CHUNK_TOKENS * CHARS_PER_TOKEN;
const OVERLAP_CHARS = OVERLAP_TOKENS * CHARS_PER_TOKEN;

/**
 * Parse a PDF file and return its extracted text.
 */
export async function parsePdf(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

/**
 * Split text into overlapping chunks of approximately CHUNK_TOKENS tokens.
 * Splits on sentence/paragraph boundaries where possible.
 */
export function chunkText(text: string): Chunk[] {
  // Normalize whitespace
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  const chunks: Chunk[] = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < normalized.length) {
    let end = start + CHUNK_CHARS;

    if (end < normalized.length) {
      // Try to break at a paragraph boundary
      const paragraphBreak = normalized.lastIndexOf('\n\n', end);
      if (paragraphBreak > start + CHUNK_CHARS / 2) {
        end = paragraphBreak;
      } else {
        // Fall back to sentence boundary (period followed by space/newline)
        const sentenceBreak = normalized.lastIndexOf('. ', end);
        if (sentenceBreak > start + CHUNK_CHARS / 2) {
          end = sentenceBreak + 1; // include the period
        }
      }
    }

    const content = normalized.slice(start, end).trim();
    if (content.length > 0) {
      chunks.push({ content, chunkIndex });
      chunkIndex++;
    }

    // Move start forward with overlap
    start = Math.max(start + 1, end - OVERLAP_CHARS);
  }

  return chunks;
}

/**
 * Parse a PDF and return chunked text ready for embedding.
 */
export async function parsePdfIntoChunks(filePath: string): Promise<Chunk[]> {
  const text = await parsePdf(filePath);
  return chunkText(text);
}
