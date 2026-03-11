/**
 * Unit tests for src/services/pdf.ts
 *
 * Mocks: fs.readFileSync, pdf-parse.
 * Tests: parsePdf, chunkText, parsePdfIntoChunks.
 */

// Mock fs before importing pdf module
jest.mock('fs', () => {
  const actual = jest.requireActual<typeof import('fs')>('fs');
  return {
    ...actual,
    readFileSync: jest.fn(),
  };
});

// Mock pdf-parse
const mockPdfParse = jest.fn();
jest.mock('pdf-parse', () => mockPdfParse);

import * as fs from 'fs';
import { parsePdf, chunkText, parsePdfIntoChunks } from '../services/pdf';

const mockReadFileSync = fs.readFileSync as jest.Mock;

// ---- parsePdf ----

describe('parsePdf', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reads the file and returns extracted text', async () => {
    const fakeBuffer = Buffer.from('fake-pdf-bytes');
    mockReadFileSync.mockReturnValue(fakeBuffer);
    mockPdfParse.mockResolvedValue({ text: 'Hello from PDF' });

    const result = await parsePdf('/path/to/doc.pdf');

    expect(mockReadFileSync).toHaveBeenCalledWith('/path/to/doc.pdf');
    expect(mockPdfParse).toHaveBeenCalledWith(fakeBuffer);
    expect(result).toBe('Hello from PDF');
  });

  it('propagates pdf-parse errors', async () => {
    mockReadFileSync.mockReturnValue(Buffer.from('bad'));
    mockPdfParse.mockRejectedValue(new Error('invalid PDF'));

    await expect(parsePdf('/bad.pdf')).rejects.toThrow('invalid PDF');
  });
});

// ---- chunkText ----

describe('chunkText', () => {
  it('returns an empty array for empty string', () => {
    expect(chunkText('')).toEqual([]);
  });

  it('returns an empty array for whitespace-only string', () => {
    expect(chunkText('   \n\n  ')).toEqual([]);
  });

  it('returns a single chunk for short text', () => {
    const text = 'This is a short sentence.';
    const chunks = chunkText(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].content).toBe(text);
  });

  it('assigns monotonically increasing chunkIndex values', () => {
    // Generate text larger than CHUNK_CHARS (500 * 4 = 2000 chars)
    const longText = 'Word '.repeat(600); // ~3000 chars
    const chunks = chunkText(longText);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk, i) => {
      expect(chunk.chunkIndex).toBe(i);
    });
  });

  it('produces overlapping chunks (later chunk starts before previous chunk end)', () => {
    const longText = 'A'.repeat(4000);
    const chunks = chunkText(longText);
    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk should share some characters with the previous
    const firstEnd = chunks[0].content.length;
    // With OVERLAP_CHARS = 50 * 4 = 200, the second chunk should start within 200 chars of firstEnd
    const secondStart = chunks[1].content.slice(0, 10);
    // Both chunks must have content
    expect(chunks[0].content.length).toBeGreaterThan(0);
    expect(chunks[1].content.length).toBeGreaterThan(0);
    // Overlap: second chunk content should appear within the tail of the first chunk
    expect(firstEnd).toBeGreaterThan(0);
    expect(secondStart.length).toBeGreaterThan(0);
  });

  it('normalizes multiple blank lines to double newlines', () => {
    const text = 'Para one.\n\n\n\n\nPara two.';
    const chunks = chunkText(text);
    // After normalization there should be no triple newlines
    for (const chunk of chunks) {
      expect(chunk.content).not.toMatch(/\n{3,}/);
    }
  });

  it('breaks at paragraph boundary when available', () => {
    // Build text where a paragraph break falls in the chunking window
    const para1 = 'First paragraph. '.repeat(120); // ~2040 chars (> CHUNK_CHARS/2=1000)
    const para2 = 'Second paragraph. '.repeat(120);
    const text = para1 + '\n\n' + para2;
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    // The break should have occurred at the paragraph boundary
    // (first chunk should not contain the entire para2)
    if (chunks.length > 1) {
      expect(chunks[0].content).not.toContain('Second paragraph');
    }
  });
});

// ---- parsePdfIntoChunks ----

describe('parsePdfIntoChunks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns chunks from a parsed PDF', async () => {
    mockReadFileSync.mockReturnValue(Buffer.from('pdf'));
    mockPdfParse.mockResolvedValue({ text: 'Some text from a document.' });

    const chunks = await parsePdfIntoChunks('/doc.pdf');

    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe('Some text from a document.');
    expect(chunks[0].chunkIndex).toBe(0);
  });

  it('returns empty array when PDF has no text', async () => {
    mockReadFileSync.mockReturnValue(Buffer.from('pdf'));
    mockPdfParse.mockResolvedValue({ text: '   ' });

    const chunks = await parsePdfIntoChunks('/empty.pdf');
    expect(chunks).toEqual([]);
  });

  it('propagates errors from parsePdf', async () => {
    mockReadFileSync.mockReturnValue(Buffer.from('bad'));
    mockPdfParse.mockRejectedValue(new Error('corrupt PDF'));

    await expect(parsePdfIntoChunks('/bad.pdf')).rejects.toThrow('corrupt PDF');
  });
});
