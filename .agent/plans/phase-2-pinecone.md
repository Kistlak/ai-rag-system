# Phase 2 — Pinecone Setup

## Goal
Create a Pinecone serverless index and a thin TypeScript client wrapper that can upsert vectors and query by vector. End with a smoke test confirming round-trip reads/writes.

## Deliverables
- A live Pinecone serverless index named `bbc-news` (1536 dims, cosine, AWS `us-east-1`).
- `lib/rag/pinecone.ts` exporting:
  - A singleton `pc` Pinecone client.
  - The `index` handle.
  - `upsertChunks(vectors)` helper (batches of 100).
  - `queryByVector(vector, topK)` helper.
- Vector metadata schema documented and enforced via TypeScript types.
- A smoke-test script that proves the pipeline works.

## Pre-flight checks
- Phase 1 complete (Pinecone deps installed, `.env.local` has `PINECONE_API_KEY` and `PINECONE_INDEX`).
- User has signed up for Pinecone (free tier is fine).

## Steps

### 1. Create the Pinecone index (manual, in the Pinecone console)
- Name: `bbc-news`
- Dimensions: `1536`
- Metric: `cosine`
- Type: Serverless
- Cloud: AWS
- Region: `us-east-1`

Confirm with the user that the index is created and `PINECONE_INDEX=bbc-news` matches.

### 2. Define the metadata type
Create `lib/rag/types.ts`:
```ts
export interface ChunkMetadata {
  articleUrl: string;
  title: string;
  publishedAt: string;   // ISO 8601
  chunkIndex: number;
  text: string;
}
```

### 3. Create `lib/rag/pinecone.ts`
Export:
- `pc` — singleton `Pinecone` client constructed from `PINECONE_API_KEY`.
- `index` — handle to `process.env.PINECONE_INDEX`.
- `upsertChunks(vectors)` — accepts `{ id, values, metadata }[]`, batches 100 per call.
- `queryByVector(vector, topK)` — calls `index.query({ vector, topK, includeMetadata: true })`.

Use the reference snippet from the PDF (section 4) as the starting template. Tighten the metadata type from `Record<string, any>` to `ChunkMetadata`.

### 4. Smoke-test script
Create `scripts/pinecone-smoke.ts`:
- Generates one fake 1536-dim vector (e.g. all 0.01 values).
- Upserts it with id `smoke-test`, metadata `{ articleUrl: "https://example.com", title: "smoke", publishedAt: new Date().toISOString(), chunkIndex: 0, text: "hello world" }`.
- Queries with the same vector.
- Asserts the top match has id `smoke-test`.
- Deletes the test vector at the end (`index.deleteOne("smoke-test")`).

Add to `package.json` scripts:
```json
"pinecone:smoke": "tsx -r dotenv/config scripts/pinecone-smoke.ts dotenv_config_path=.env.local"
```

### 5. Run it
```bash
npm run pinecone:smoke
```
Expect output like: `✓ upserted ✓ queried ✓ matched ✓ cleaned up`.

## Checkpoint
- `npm run pinecone:smoke` exits 0 with the expected output.
- The Pinecone dashboard shows the index exists (briefly with 1 vector during the test, then empty).

## Commit
```
Phase 2: Pinecone client wrapper + smoke test passing
```

## Notes / pitfalls
- Pinecone serverless indexes can take ~30s to be queryable after creation. If the smoke test fails immediately after index creation, retry after a minute.
- Don't hard-code the index name — always read from `process.env.PINECONE_INDEX`.
- Pinecone metadata values must be primitive or arrays of primitives. `text` must be a string (not stringified JSON).
