export interface Chunk {
  text: string;
  index: number;
}

interface ChunkOptions {
  targetTokens?: number;
  overlapTokens?: number;
}

function approxTokens(text: string): number {
  return text.split(/\s+/).length / 0.75;
}

export function chunkText(
  text: string,
  { targetTokens = 600, overlapTokens = 80 }: ChunkOptions = {}
): Chunk[] {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  const chunks: Chunk[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  for (const para of paragraphs) {
    const paraTokens = approxTokens(para);

    if (currentTokens + paraTokens > targetTokens && current.length > 0) {
      chunks.push({ text: current.join("\n\n"), index: chunks.length });

      // Seed next chunk with trailing overlap from the current one
      const overlap: string[] = [];
      let overlapCount = 0;
      for (let i = current.length - 1; i >= 0; i--) {
        const t = approxTokens(current[i]);
        if (overlapCount + t > overlapTokens) break;
        overlap.unshift(current[i]);
        overlapCount += t;
      }
      current = overlap;
      currentTokens = overlapCount;
    }

    current.push(para);
    currentTokens += paraTokens;
  }

  if (current.length > 0) {
    chunks.push({ text: current.join("\n\n"), index: chunks.length });
  }

  return chunks;
}
