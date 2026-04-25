import type { RecordMetadataValue } from "@pinecone-database/pinecone";

export interface ChunkMetadata {
  [key: string]: RecordMetadataValue;
  articleUrl: string;
  title: string;
  publishedAt: string; // ISO 8601
  chunkIndex: number;
  text: string;
  // imageUrl is stored as a plain string key when present (covered by the index signature)
}

export interface RetrievedChunk {
  text: string;
  title: string;
  articleUrl: string;
  publishedAt: string;
  score: number;
  imageUrl?: string;
}
