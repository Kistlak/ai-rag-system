import { createHash } from "crypto";
import { fetchArticle } from "./article";
import { chunkText } from "../rag/chunk";
import { embed } from "../rag/embed";
import { upsertChunks } from "../rag/pinecone";
import { createAdminSupabaseClient } from "../db/server";
import type { ChunkMetadata } from "../rag/types";

const HARD_MAX_CHUNKS = 200;

function urlHash(url: string): string {
  return createHash("sha1").update(url).digest("hex").slice(0, 16);
}

export interface SingleUrlIngestResult {
  chunksUpserted: number;
  title: string | null;
}

export async function runSingleUrlIngest(
  sourceId: string,
  assistantId: string,
  url: string,
  pineconeNamespace: string,
  maxChunks: number = 50
): Promise<SingleUrlIngestResult> {
  const admin = createAdminSupabaseClient();

  // Mark as processing
  await admin
    .from("sources")
    .update({ status: "processing" })
    .eq("id", sourceId);

  try {
    const article = await fetchArticle(url);
    if (!article) throw new Error("Could not extract usable text from URL");

    const allChunks = chunkText(article.text);
    const limit = Math.min(Math.max(1, maxChunks), HARD_MAX_CHUNKS);
    const chunks = allChunks.slice(0, limit);
    if (chunks.length === 0) throw new Error("No chunks produced from article text");

    const embeddings = await embed(chunks.map((c) => c.text));
    const hash = urlHash(url);

    const vectors = chunks.map((chunk, i) => {
      const metadata: ChunkMetadata = {
        articleUrl: url,
        title: article.title ?? url,
        publishedAt: new Date().toISOString(),
        chunkIndex: chunk.index,
        text: chunk.text,
      };
      if (article.imageUrl) metadata.imageUrl = article.imageUrl;
      return { id: `${hash}-${chunk.index}`, values: embeddings[i], metadata };
    });

    await upsertChunks(vectors, pineconeNamespace);

    // Mark as ready
    await admin
      .from("sources")
      .update({
        status: "ready",
        title: article.title ?? null,
        chunk_count: chunks.length,
        ingested_at: new Date().toISOString(),
      })
      .eq("id", sourceId);

    return { chunksUpserted: chunks.length, title: article.title };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await admin
      .from("sources")
      .update({ status: "failed", error: message })
      .eq("id", sourceId);
    throw err;
  }
}
