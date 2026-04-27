import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const WINDOW_MS = 60_000;
const MAX = 20;

// In-memory fallback (per-instance) used when Upstash env vars are missing
const memMap = new Map<string, number[]>();

function memCheck(key: string): boolean {
  const now = Date.now();
  const times = (memMap.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (times.length >= MAX) return true;
  times.push(now);
  memMap.set(key, times);
  return false;
}

let upstashRatelimit: Ratelimit | null = null;
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (url && token) {
  const redis = new Redis({ url, token });
  upstashRatelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(MAX, "60 s"),
    analytics: false,
    prefix: "rl:chat",
  });
}

// Returns true if the request should be blocked
export async function isRateLimited(key: string): Promise<boolean> {
  if (upstashRatelimit) {
    const { success } = await upstashRatelimit.limit(key);
    return !success;
  }
  return memCheck(key);
}
