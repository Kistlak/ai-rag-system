import { embed } from "./embed";
import { queryByVector } from "./pinecone";
import type { RetrievedChunk } from "./types";

const SCORE_FLOOR = 0.2;

export async function retrieve(
  query: string,
  topK = 5,
  namespace?: string
): Promise<RetrievedChunk[]> {
  const [vector] = await embed([query]);
  const matches = await queryByVector(vector, topK, namespace);

  return matches
    .filter((m) => m.metadata && m.score >= SCORE_FLOOR)
    .map((m) => ({
      text: m.metadata.text,
      title: m.metadata.title,
      articleUrl: m.metadata.articleUrl,
      publishedAt: m.metadata.publishedAt,
      score: m.score,
      imageUrl: typeof m.metadata.imageUrl === "string" ? m.metadata.imageUrl : undefined,
    }));
}

export function buildPrompt(
  question: string,
  chunks: RetrievedChunk[],
  systemPromptOverride?: string | null
): { system: string } {
  const context = chunks
    .map(
      (c, i) =>
        `[Source ${i + 1}] ${c.title} (${c.articleUrl}) — published ${c.publishedAt}\n${c.text}`
    )
    .join("\n\n");

  const system =
    systemPromptOverride ??
    `You are a helpful assistant answering questions using only the articles provided below.
- Cite sources inline as [Source N] where N matches the numbering in the context.
- If the answer is not in the context, say so honestly. Do not invent facts.
- Keep answers concise and factual. Quote sparingly.

Context:
${context}`;

  return { system };
}
