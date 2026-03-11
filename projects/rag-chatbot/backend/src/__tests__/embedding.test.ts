/**
 * Unit tests for src/services/embedding.ts
 *
 * The module uses @google/genai with VertexAI and reads service_key.json at
 * module load time. Both are mocked here so no real credentials are needed.
 *
 * API: ai.models.embedContent({ model, contents }) → { embeddings: [{ values }] }
 */

// Mock fs to intercept service_key.json read at module load time
jest.mock('fs', () => {
  const actual = jest.requireActual<typeof import('fs')>('fs');
  return {
    ...actual,
    readFileSync: (filePath: unknown, encoding?: unknown) => {
      if (String(filePath).includes('service_key.json')) {
        return JSON.stringify({ project_id: 'test-project' });
      }
      return actual.readFileSync(filePath as string, encoding as BufferEncoding);
    },
  };
});

// Primary mock: @google/genai
const mockEmbedContent = jest.fn();
jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: {
      embedContent: mockEmbedContent,
    },
  })),
}));

import { generateEmbeddings, generateQueryEmbedding } from '../services/embedding';

const EMBEDDING_DIM = 3072;
const mockVector = Array.from({ length: EMBEDDING_DIM }, (_, i) => i * 0.001);

describe('generateEmbeddings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns [] for empty input without calling the API', async () => {
    const result = await generateEmbeddings([]);
    expect(result).toEqual([]);
    expect(mockEmbedContent).not.toHaveBeenCalled();
  });

  it('returns an array of 3072-dim vectors for a single text input', async () => {
    mockEmbedContent.mockResolvedValue({
      embeddings: [{ values: mockVector }],
    });

    const result = await generateEmbeddings(['hello world']);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(EMBEDDING_DIM);
  });

  it('propagates API errors correctly', async () => {
    mockEmbedContent.mockRejectedValue(new Error('API quota exceeded'));

    await expect(generateEmbeddings(['some text'])).rejects.toThrow(
      'API quota exceeded'
    );
  });
});

describe('generateQueryEmbedding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a single 3072-dim vector for a query string', async () => {
    mockEmbedContent.mockResolvedValue({
      embeddings: [{ values: mockVector }],
    });

    const result = await generateQueryEmbedding('what is the capital of France?');
    expect(result).toHaveLength(EMBEDDING_DIM);
    expect(typeof result[0]).toBe('number');
  });
});
