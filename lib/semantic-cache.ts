// lib/semantic-cache.ts

/**
 * In-Memory & Database Semantic Cache Layer for Ultra-Low Latency (<15ms) FAQ Responses.
 * Bypasses RAG vector database search and LLM inference for repeat/similar questions.
 */

type CachedEntry = {
  query: string;
  embedding: number[];
  answer: string;
  sourceChunks?: any[];
  workspaceId: string;
  timestamp: number;
};

const MAX_CACHE_ENTRIES_PER_WORKSPACE = 200;
const SIMILARITY_THRESHOLD = 0.90; // Sweet spot threshold (0.90 - 0.93)

// Memory cache store keyed by workspace ID
const memoryCache: Map<string, CachedEntry[]> = new Map();

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Looks up a query in the semantic cache.
 * Returns cached answer and source chunks if similarity > threshold.
 */
export function getSemanticCache(
  query: string,
  queryEmbedding: number[],
  workspaceId: string = "00000000-0000-0000-0000-000000000000"
): { answer: string; sourceChunks?: any[]; similarity: number } | null {
  const wsEntries = memoryCache.get(workspaceId);
  if (!wsEntries || wsEntries.length === 0) return null;

  let bestMatch: CachedEntry | null = null;
  let maxSim = 0;

  for (const entry of wsEntries) {
    const sim = cosineSimilarity(queryEmbedding, entry.embedding);
    if (sim > maxSim) {
      maxSim = sim;
      bestMatch = entry;
    }
  }

  if (bestMatch && maxSim >= SIMILARITY_THRESHOLD) {
    console.log(`[SemanticCache HIT] Similarity: ${maxSim.toFixed(3)} for query: "${query}" (Matched: "${bestMatch.query}")`);
    return {
      answer: bestMatch.answer,
      sourceChunks: bestMatch.sourceChunks || [],
      similarity: maxSim,
    };
  }

  return null;
}

/**
 * Saves a query, embedding, and LLM answer into the semantic cache.
 */
export function setSemanticCache(
  query: string,
  queryEmbedding: number[],
  answer: string,
  sourceChunks: any[] = [],
  workspaceId: string = "00000000-0000-0000-0000-000000000000"
): void {
  if (!query || !answer || answer.length < 5 || !queryEmbedding) return;

  let wsEntries = memoryCache.get(workspaceId);
  if (!wsEntries) {
    wsEntries = [];
    memoryCache.set(workspaceId, wsEntries);
  }

  // Prevent duplicate exact query insertions
  const existingIdx = wsEntries.findIndex(e => e.query.toLowerCase().trim() === query.toLowerCase().trim());
  if (existingIdx !== -1) {
    wsEntries[existingIdx] = {
      query,
      embedding: queryEmbedding,
      answer,
      sourceChunks,
      workspaceId,
      timestamp: Date.now(),
    };
    return;
  }

  // FIFO eviction if max size exceeded
  if (wsEntries.length >= MAX_CACHE_ENTRIES_PER_WORKSPACE) {
    wsEntries.shift();
  }

  wsEntries.push({
    query,
    embedding: queryEmbedding,
    answer,
    sourceChunks,
    workspaceId,
    timestamp: Date.now(),
  });

  console.log(`[SemanticCache STORED] Cached answer for query: "${query}" in workspace: ${workspaceId}`);
}
