# Phase 8 — Polish & Deploy

## Goal
Round off the rough edges, deploy to Vercel, and verify all acceptance criteria from PDF section 5.

## Deliverables
- `README.md` covering setup, env vars, local dev, ingestion, and deploy.
- Friendly error handling on empty retrieval.
- Rate limiting on `/api/chat`.
- Live Vercel deployment with all env vars and cron firing.

## Pre-flight checks
- Phases 1–7 all green and committed.
- A GitHub repo exists (or is about to be created) for this code.
- The user has a Vercel account.

## Steps

### 1. README.md
Sections:
1. **What this is** (1 paragraph).
2. **Tech stack** (mirror PDF section 1 table).
3. **Local setup**:
   - Clone, `npm install`, copy `.env.example` to `.env.local`, fill in keys.
   - `npm run pinecone:smoke` to verify Pinecone.
   - `npm run ingest:local` to seed the index.
   - `npm run dev` to start the chat UI.
4. **Deployment** (Vercel one-click + env vars + initial ingest curl).
5. **Architecture diagram** (a simple ASCII flow: RSS → ingest → Pinecone → chat → Anthropic).
6. **Legal note** (BBC content copyright, RSS-only ingestion, source links shown — copy from PDF section 7).

### 2. Empty-retrieval fallback
In `app/api/chat/route.ts`: if `chunks.length === 0`, short-circuit and stream a fixed message:
> "I couldn't find anything in BBC coverage on that. Try rephrasing or asking about a different recent story."

Use `streamText` with a system that hard-codes the fallback, or return a minimal mock stream — either is fine. Keep it consistent with the streaming UI contract so the UI doesn't need a special case.

### 3. Rate limiting on `/api/chat`
Two acceptable approaches:
- **Upstash Ratelimit** (recommended for production):
  - `npm i @upstash/ratelimit @upstash/redis`
  - Add `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` to env.
  - Limit: 20 requests / 60s per IP.
- **In-memory limiter** (simpler, fine for personal/edu use, not multi-instance-safe):
  - A `Map<ip, timestamps[]>` that drops requests over the threshold. Document the limitation in the README.

Pick one with the user. Default to in-memory for the personal/educational scope of this project.

### 4. Push to GitHub
```bash
git remote add origin <user-supplied URL>
git push -u origin main
```
**Confirm the remote URL with the user before pushing.**

### 5. Import into Vercel
1. Vercel dashboard → New Project → Import the GitHub repo.
2. Framework: Next.js (auto-detected).
3. Add env vars (all five from `.env.example` + Upstash if used):
   - `ANTHROPIC_API_KEY`
   - `OPENAI_API_KEY`
   - `PINECONE_API_KEY`
   - `PINECONE_INDEX`
   - `CRON_SECRET`
4. Deploy.

### 6. Trigger first cloud ingest
After deploy succeeds:
```bash
curl -i -H "Authorization: Bearer <CRON_SECRET>" \
  https://<project>.vercel.app/api/ingest
```

### 7. Verify cron
- Vercel dashboard → Project → Settings → Cron Jobs → `/api/ingest` listed with schedule `0 * * * *`.
- Wait one cron firing and confirm it ran (logs tab).

## Checkpoint — full acceptance criteria
Run through PDF section 5:
- [ ] Pinecone holds ≥ 1,000 vectors from ≥ 100 unique BBC articles.
- [ ] Cron has run at least once on Vercel without errors; new articles appear within an hour.
- [ ] A question about a recent BBC story returns top-5 chunks all from relevant articles.
- [ ] Chat streams token-by-token; cites sources by URL.
- [ ] Off-topic question returns the graceful fallback.
- [ ] Cold-start page load < 1.5s; mobile + desktop both responsive.
- [ ] All secrets in env vars; ingest endpoint rejects missing/wrong bearer.
- [ ] `npx tsc --noEmit` passes; `npm run lint` passes; no `any` in business logic.

## Commit
```
Phase 8: README, error handling, rate limiting, deployed to Vercel
```

## Notes / pitfalls
- Vercel may need a redeploy after adding env vars — double-check by hitting `/api/chat` post-deploy.
- Don't skip the bearer check on `/api/ingest` thinking "it's behind Vercel anyway" — without it, anyone who finds the URL can run up your OpenAI bill.
- If TypeScript or ESLint catches issues only in production build (`next build`) — fix them, don't disable.
