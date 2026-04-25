# Phase 7 — Cron Ingestion

## Goal
Wire the ingestion pipeline behind an HTTP endpoint that Vercel Cron can hit hourly, secured by a bearer token.

## Deliverables
- `app/api/ingest/route.ts` — GET handler, bearer-token auth, runs the pipeline.
- `vercel.json` — cron schedule.

## Pre-flight checks
- Phase 3 complete; `runIngest()` works locally.
- `CRON_SECRET` set in `.env.local` (and ready to add to Vercel env vars at deploy time).

## Steps

### 1. Route handler — `app/api/ingest/route.ts`
```ts
import { runIngest } from "@/lib/ingest/pipeline";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const summary = await runIngest();
  return Response.json({ ok: true, ...summary });
}
```

Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically when the env var is set on the project — confirm against current Vercel docs at deploy time.

### 2. `vercel.json`
```json
{
  "crons": [
    { "path": "/api/ingest", "schedule": "0 * * * *" }
  ]
}
```
This runs at the top of every hour. Cron only fires on production deployments.

### 3. Local manual smoke test
```bash
curl -i http://localhost:3000/api/ingest        # expect 401
curl -i -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)" \
  http://localhost:3000/api/ingest              # expect 200 with summary
```

### 4. (Optional) Sanity-check cron expression
- `0 * * * *` = "minute 0 of every hour" → hourly.
- If we want to be gentler on cost, switch to `0 */3 * * *` (every 3 hours). Document the decision here.

## Checkpoint
- Local: GET without bearer returns 401; with bearer returns 200 + summary.
- `vercel.json` is valid JSON and lints cleanly.
- After deploy (Phase 8): the Vercel dashboard's Cron tab shows `/api/ingest` scheduled and the next run time.

## Commit
```
Phase 7: cron-secured ingestion endpoint + vercel.json schedule
```

## Notes / pitfalls
- **Vercel Hobby plan limit:** 60s function timeout and limited cron schedules. If `runIngest` exceeds 60s, chunk it: process N articles per call and store cursor state — but defer that complication until it's actually needed. For first deploy, hourly + `maxDuration: 60` should be enough since dedup keeps each run small.
- Don't expose any other route to cron without the same bearer guard.
- Never log `CRON_SECRET`. If you log the auth header for debugging, redact it.
