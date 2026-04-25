# Phase 3 — Ingestion Pipeline

## Goal
Build the pipeline that pulls BBC RSS articles, extracts clean text, chunks it, embeds the chunks, and upserts them to Pinecone. End with a local script that populates the index with hundreds of vectors.

## Deliverables
- `lib/ingest/rss.ts` — parses BBC RSS feeds, returns `{ url, title, publishedAt }[]`.
- `lib/ingest/article.ts` — fetches an article URL and extracts clean text.
- `lib/rag/chunk.ts` — chunks text into ~600-token windows with ~80-token overlap.
- `lib/rag/embed.ts` — batches chunks through OpenAI `text-embedding-3-small`.
- `lib/ingest/pipeline.ts` — orchestrates fetch → extract → chunk → embed → upsert with URL-level dedup.
- `scripts/ingest-local.ts` — runs the pipeline end-to-end against `.env.local`.

## Pre-flight checks
- Phase 2 complete and smoke test green.
- `OPENAI_API_KEY` set in `.env.local`.

## Steps

### 1. RSS fetcher — `lib/ingest/rss.ts`
- Use `rss-parser` (`new Parser()`).
- Default feed list (export as `BBC_FEEDS`):
  - `http://feeds.bbci.co.uk/news/rss.xml`
  - `http://feeds.bbci.co.uk/news/world/rss.xml`
  - `http://feeds.bbci.co.uk/news/technology/rss.xml`
- Export `fetchAllRssItems()` returning `{ url, title, publishedAt }[]` (deduped by url).
- Drop items with no `link`, no `title`, or no `pubDate`.

### 2. Article extractor — `lib/ingest/article.ts`
- `fetchArticleText(url): Promise<string | null>`.
- `fetch(url)` with a real user-agent header. Throw on non-2xx.
- Parse with `cheerio`. Concatenate text from `article [data-component='text-block']` paragraphs.
- Trim whitespace, collapse repeated newlines.
- Return `null` if the result is shorter than **200 chars** (skip it).

### 3. Chunker — `lib/rag/chunk.ts`
- `chunkText(text, { targetTokens = 600, overlapTokens = 80 })`.
- Split on paragraph boundaries (`\n\n`).
- Approximate tokens with `words.length / 0.75` (1 token ≈ 0.75 words).
- Greedily group paragraphs until the current chunk would exceed `targetTokens`. Start the next chunk by including the trailing ~`overlapTokens` worth of words from the previous chunk.
- Return `{ text: string; index: number }[]`.

### 4. Embedder — `lib/rag/embed.ts`
- `embed(texts: string[]): Promise<number[][]>`.
- Use the `openai` SDK with model `text-embedding-3-small`.
- Batch internally: max **100 inputs** per API call.
- Concatenate results, preserving input order.
- Use the reference snippet in PDF section 4 as the starting template.

### 5. Pipeline — `lib/ingest/pipeline.ts`
Export `runIngest({ maxArticles?: number } = {})`:
1. Fetch RSS items.
2. **Dedup by URL:** for each candidate URL, query Pinecone for any vector with `articleUrl == url` (use a metadata filter query with a zero vector + `topK: 1`, or maintain a small in-memory cache for the run). Skip already-indexed articles.
3. For each new article: fetch HTML → extract text → skip if `null`.
4. Chunk the text.
5. Embed all chunks for this article in one (or batched) call.
6. Upsert vectors with id `${urlHash}-${chunkIndex}` (use a stable hash like `crypto.createHash('sha1').update(url).digest('hex').slice(0, 16)`).
7. Log progress: `[ingest] {title} → N chunks upserted`.
8. Return summary `{ articlesIndexed, chunksUpserted, skipped }`.

### 6. Local runner — `scripts/ingest-local.ts`
- Loads `.env.local` via `dotenv`.
- Calls `runIngest()`.
- Prints the summary.

Add `package.json` script:
```json
"ingest:local": "tsx -r dotenv/config scripts/ingest-local.ts dotenv_config_path=.env.local"
```

### 7. Run it
```bash
npm run ingest:local
```
Expect 50–200 articles to be indexed on the first run, producing several hundred to a few thousand chunks.

## Checkpoint
- `npm run ingest:local` completes without errors.
- Pinecone dashboard shows index size has grown (target: ≥ several hundred vectors after first run).
- Re-running the script should index 0 new articles (dedup works) — same vector count.

## Commit
```
Phase 3: ingestion pipeline working end-to-end (RSS → chunk → embed → Pinecone)
```

## Notes / pitfalls
- BBC RSS uses `http://` (not `https://`) — keep as-is unless redirects fail.
- Some BBC pages (live blogs, video-only) won't have `[data-component='text-block']` and will return `null` — that's expected; skip them.
- OpenAI embedding rate limits: be conservative with concurrency. Sequential batches are fine for first ingest.
- Cost: `text-embedding-3-small` is ~$0.02 per 1M tokens — first ingest of ~150 articles ≈ a few cents.
- **Dedup strategy fallback:** if metadata-filter queries on Pinecone are awkward, alternative is to maintain a separate `seen-urls.json` file alongside, or skip dedup on first run and rely on stable IDs (Pinecone upsert is idempotent on id).
