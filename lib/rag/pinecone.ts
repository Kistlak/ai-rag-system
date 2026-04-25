import { Pinecone } from "@pinecone-database/pinecone";
import type { ChunkMetadata } from "./types";

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

export const index = pc.index<ChunkMetadata>(process.env.PINECONE_INDEX!);

export async function upsertChunks(
  vectors: { id: string; values: number[]; metadata: ChunkMetadata }[]
): Promise<void> {
  const BATCH = 100;
  for (let i = 0; i < vectors.length; i += BATCH) {
    await index.upsert({ records: vectors.slice(i, i + BATCH) });
  }
}

export async function queryByVector(
  vector: number[],
  topK: number
): Promise<{ id: string; score: number; metadata: ChunkMetadata }[]> {
  const result = await index.query({ vector, topK, includeMetadata: true });
  return result.matches.map((m) => ({
    id: m.id,
    score: m.score ?? 0,
    metadata: m.metadata as ChunkMetadata,
  }));
}
