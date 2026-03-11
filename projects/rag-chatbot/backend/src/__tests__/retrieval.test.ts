/**
 * Unit tests for src/services/retrieval.ts
 *
 * Mocks the pg Pool client to test retrieveTopChunks without a live database.
 */

import type { PoolClient } from 'pg';

// Mock ../db/client (the Pool instance) before importing retrieval.ts
const mockRelease = jest.fn();
const mockQuery = jest.fn();
const mockConnect = jest.fn();

jest.mock('../db/client', () => ({
  __esModule: true,
  default: {
    connect: mockConnect,
  },
}));

import { retrieveTopChunks } from '../services/retrieval';

const fakeEmbedding = Array.from({ length: 3072 }, (_, i) => i * 0.001);

function makeClient(queryResults: object[]): PoolClient {
  let callCount = 0;
  const queryFn = jest.fn().mockImplementation(() => {
    const result = queryResults[callCount] ?? { rows: [] };
    callCount++;
    return Promise.resolve(result);
  });
  return {
    query: queryFn,
    release: mockRelease,
  } as unknown as PoolClient;
}

describe('retrieveTopChunks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns top-k results sorted by similarity', async () => {
    const rows = [
      { id: 1, content: 'alpha', source_file: 'a.pdf', chunk_index: 0, similarity: '0.95' },
      { id: 2, content: 'beta', source_file: 'b.pdf', chunk_index: 1, similarity: '0.80' },
    ];
    // query calls: BEGIN, SET LOCAL ivfflat.probes, SELECT, COMMIT
    const client = makeClient([{}, {}, { rows }, {}]);
    mockConnect.mockResolvedValue(client);

    const results = await retrieveTopChunks(fakeEmbedding, 5);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      id: 1,
      content: 'alpha',
      sourceFile: 'a.pdf',
      chunkIndex: 0,
    });
    expect(results[0].similarity).toBeCloseTo(0.95);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('returns [] when the database has no rows', async () => {
    const client = makeClient([{}, {}, { rows: [] }, {}]);
    mockConnect.mockResolvedValue(client);

    const results = await retrieveTopChunks(fakeEmbedding, 5);

    expect(results).toEqual([]);
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('parses similarity correctly from string to float', async () => {
    const rows = [
      { id: 3, content: 'gamma', source_file: null, chunk_index: null, similarity: '0.123456' },
    ];
    const client = makeClient([{}, {}, { rows }, {}]);
    mockConnect.mockResolvedValue(client);

    const results = await retrieveTopChunks(fakeEmbedding, 1);

    expect(typeof results[0].similarity).toBe('number');
    expect(results[0].similarity).toBeCloseTo(0.123456);
  });

  it('releases the client and re-throws on query error', async () => {
    const client = {
      query: jest.fn()
        .mockResolvedValueOnce({})     // BEGIN
        .mockResolvedValueOnce({})     // SET LOCAL
        .mockRejectedValueOnce(new Error('DB error')), // SELECT
      release: mockRelease,
    } as unknown as PoolClient;
    mockConnect.mockResolvedValue(client);

    await expect(retrieveTopChunks(fakeEmbedding, 5)).rejects.toThrow('DB error');
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });
});
