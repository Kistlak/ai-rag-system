import type { RecordMetadataValue } from "@pinecone-database/pinecone";

export interface ChunkMetadata {
  [key: string]: RecordMetadataValue;
  articleUrl: string;
  title: string;
  publishedAt: string; // ISO 8601
  chunkIndex: number;
  text: string;
}

export interface RetrievedChunk {
  text: string;
  title: string;
  articleUrl: string;
  publishedAt: string;
  score: number;
}
