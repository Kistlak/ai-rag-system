import { createHash } from "crypto";
import { fetchAllRssItems } from "./rss";
import { fetchArticle } from "./article";
import { chunkText } from "../rag/chunk";
import { embed } from "../rag/embed";
import { index, upsertChunks } from "../rag/pinecone";

const ZERO_VECTOR = Array(1536).fill(0) as number[];

async function isArticleIndexed(url: string): Promise<boolean> {
  const result = await index.query({
    vector: ZERO_VECTOR,
    topK: 1,
    filter: { articleUrl: { $eq: url } },
    includeMetadata: false,
  });
  return result.matches.length > 0;
}

function urlHash(url: string): string {
  return createHash("sha1").update(url).digest("hex").slice(0, 16);
}

interface IngestSummary {
  articlesIndexed: number;
  chunksUpserted: number;
  skipped: number;
}

export async function runIngest(
  { maxArticles }: { maxArticles?: number } = {}
): Promise<IngestSummary> {
  const items = await fetchAllRssItems();
  const candidates = maxArticles ? items.slice(0, maxArticles) : items;

  let articlesIndexed = 0;
  let chunksUpserted = 0;
  let skipped = 0;

  for (const item of candidates) {
    const alreadyIndexed = await isArticleIndexed(item.url);
    if (alreadyIndexed) {
      skipped++;
      continue;
    }

    let article: Awaited<ReturnType<typeof fetchArticle>>;
    try {
      article = await fetchArticle(item.url);
    } catch (err) {
      console.warn(`[ingest] fetch failed for ${item.url}:`, err);
      skipped++;
      continue;
    }

    if (!article) {
      skipped++;
      continue;
    }

    const chunks = chunkText(article.text);
    if (chunks.length === 0) {
      skipped++;
      continue;
    }

    const embeddings = await embed(chunks.map((c) => c.text));
    const hash = urlHash(item.url);

    await upsertChunks(
      chunks.map((chunk, i) => {
        const metadata: import("../rag/types").ChunkMetadata = {
          articleUrl: item.url,
          title: item.title,
          publishedAt: item.publishedAt,
          chunkIndex: chunk.index,
          text: chunk.text,
        };
        if (article!.imageUrl) metadata.imageUrl = article!.imageUrl;
        return { id: `${hash}-${chunk.index}`, values: embeddings[i], metadata };
      })
    );

    console.log(`[ingest] "${item.title}" → ${chunks.length} chunk(s) upserted`);
    articlesIndexed++;
    chunksUpserted += chunks.length;
  }

  return { articlesIndexed, chunksUpserted, skipped };
}
