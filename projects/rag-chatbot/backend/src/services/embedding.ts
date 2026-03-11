import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

const serviceAccount = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../service_key.json'), 'utf-8')
);

const ai = new GoogleGenAI({
  vertexai: true,
  project: serviceAccount.project_id,
  location: 'global',
  googleAuthOptions: { credentials: serviceAccount },
});

/**
 * Generate embeddings for a batch of text strings using Vertex AI gemini-embedding-001.
 * Returns a 3072-dimensional vector per input.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: texts,
  });

  return (response.embeddings ?? []).map((e) => e.values ?? []);
}

/**
 * Generate a single embedding vector for a query string.
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const [embedding] = await generateEmbeddings([query]);
  return embedding;
}
