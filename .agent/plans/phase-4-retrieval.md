# Phase 4 — Retrieval Layer

## Goal
Given a user question, embed it, query Pinecone for top-k matches, and return clean source records ready for prompting. Also build the prompt-construction helper.

## Deliverables
- `lib/rag/retrieve.ts` exporting:
  - `retrieve(query: string, topK?: number)` → `RetrievedChunk[]`.
  - `buildPrompt(question: string, chunks: RetrievedChunk[])` → `{ system: string }`.
- A `RetrievedChunk` type.

## Pre-flight checks
- Phase 3 complete; Pinecone has real BBC content in it.

## Steps

### 1. Define the type
In `lib/rag/types.ts` add:
```ts
export interface RetrievedChunk {
  text: string;
  title: string;
  articleUrl: string;
  publishedAt: string;
  score: number;
}
```

### 2. `retrieve(query, topK = 5)`
1. Call `embed([query])` from `lib/rag/embed.ts`. Take `[0]`.
2. Call `queryByVector(vector, topK)` from `lib/rag/pinecone.ts`.
3. Map matches to `RetrievedChunk`. Drop matches with no metadata or score below a sane floor (e.g. < 0.2).
4. Return the array.

### 3. `buildPrompt(question, chunks)`
Returns a `{ system: string }` object so the chat route can pass it directly to `streamText`.

System prompt template:
```
You are a helpful assistant answering questions using only the BBC News articles provided below.
- Cite sources inline as [Source N] where N matches the numbering in the context.
- If the answer is not in the context, say so honestly. Do not invent facts.
- Keep answers concise and factual. Quote sparingly.

Context:
[Source 1] {title} ({articleUrl}) — published {publishedAt}
{text}

[Source 2] ...
```

Number sources starting at 1. Include `publishedAt` so the model can reason about recency.

### 4. Optional: a quick CLI to spot-check retrieval
`scripts/retrieve-test.ts`:
- Reads a query from `process.argv[2]`.
- Calls `retrieve()`.
- Prints title + score + first 80 chars of text for each hit.

Add `package.json` script:
```json
"retrieve:test": "tsx -r dotenv/config scripts/retrieve-test.ts dotenv_config_path=.env.local"
```

## Checkpoint
- `npm run retrieve:test "what happened in the latest BBC tech news"` returns 5 plausible matches from real BBC URLs with non-trivial similarity scores.
- `buildPrompt()` produces a string that visibly contains the `[Source N]` markers and the article texts.

## Commit
```
Phase 4: retrieval + prompt construction
```

## Notes / pitfalls
- Use the same OpenAI embedding model for queries and documents — never mix.
- Don't over-trim score floors; recall matters more than precision at top-5 since the LLM filters noise.
- Keep `buildPrompt` pure (no I/O) so it's trivial to unit-test later.
