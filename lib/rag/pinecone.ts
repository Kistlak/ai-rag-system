import { createHash } from "crypto";
import { Pinecone } from "@pinecone-database/pinecone";
import type { ChunkMetadata } from "./types";

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

const baseIndex = pc.index<ChunkMetadata>(process.env.PINECONE_INDEX!);

function ns(namespace?: string) {
  return namespace ? baseIndex.namespace(namespace) : baseIndex;
}

export async function upsertChunks(
  vectors: { id: string; values: number[]; metadata: ChunkMetadata }[],
  namespace?: string
): Promise<void> {
  const BATCH = 100;
  const idx = ns(namespace);
  for (let i = 0; i < vectors.length; i += BATCH) {
    await idx.upsert({ records: vectors.slice(i, i + BATCH) });
  }
}

export async function queryByVector(
  vector: number[],
  topK: number,
  namespace?: string
): Promise<{ id: string; score: number; metadata: ChunkMetadata }[]> {
  const result = await ns(namespace).query({ vector, topK, includeMetadata: true });
  return result.matches.map((m) => ({
    id: m.id,
    score: m.score ?? 0,
    metadata: m.metadata as ChunkMetadata,
  }));
}

// Cleans up Pinecone vectors for a given URL when a source is deleted
export async function deleteChunksByUrl(url: string, namespace: string): Promise<void> {
  const hash = createHash("sha1").update(url).digest("hex").slice(0, 16);
  const ids = Array.from({ length: 50 }, (_, i) => `${hash}-${i}`);
  try {
    await ns(namespace).deleteMany({ ids });
  } catch {
    // Ignore — vectors may not exist yet (e.g. failed ingest)
  }
}

// Removes every vector in a namespace (used when an assistant is deleted)
export async function deleteNamespace(namespace: string): Promise<void> {
  if (!namespace) return;
  try {
    await baseIndex.namespace(namespace).deleteAll();
  } catch {
    // Namespace may not exist if no sources were ever indexed — safe to ignore
  }
}

export { baseIndex as index };
