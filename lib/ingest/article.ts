import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { load } from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const FETCH_HEADERS: Record<string, string> = {
  "User-Agent": USER_AGENT,
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
};

const MIN_LENGTH = 200;

export interface ArticleResult {
  text: string;
  imageUrl: string | null;
  title: string | null;
}

export async function fetchArticle(url: string): Promise<ArticleResult | null> {
  // --- Attempt 1: plain fetch ---
  let plainHtml: string | null = null;
  let plainStatus: number | null = null;

  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(15_000),
      redirect: "follow",
    });
    plainStatus = res.status;
    if (res.ok) plainHtml = await res.text();
  } catch {
    // timeout or network error — fall through to Cloudflare
  }

  if (plainHtml) {
    const $ = load(plainHtml);
    const imageUrl =
      $('meta[property="og:image"]').attr("content") ??
      $('meta[name="og:image"]').attr("content") ??
      null;
    const metaTitle =
      $('meta[property="og:title"]').attr("content") ??
      $("title").first().text().trim() ??
      null;

    const readability = extractWithReadability(plainHtml, url);
    if (readability && readability.text.length >= MIN_LENGTH) {
      return { text: readability.text, imageUrl, title: readability.title ?? metaTitle };
    }

    const bbcText = extractBbcFallback($);
    if (bbcText && bbcText.length >= MIN_LENGTH) {
      return { text: bbcText, imageUrl, title: metaTitle };
    }
    // HTML fetched but content too short (JS SPA) — fall through to Cloudflare
  }

  // --- Attempt 2: Cloudflare Browser Rendering /markdown ---
  const cfResult = await fetchWithCloudflareMarkdown(url);

  if (cfResult === "not_configured") {
    // No Cloudflare creds — surface the original HTTP error or SPA warning
    if (plainStatus === 403 || plainStatus === 401) {
      throw new Error(
        `Access blocked (HTTP ${plainStatus}) — ${hostname(url)} blocks automated access. ` +
        `Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_BROWSER_TOKEN to enable JS rendering, ` +
        `or try a different URL.`
      );
    }
    if (plainStatus === 429) {
      throw new Error(`Rate limited (HTTP 429) by ${hostname(url)}. Wait a few minutes and try again.`);
    }
    if (plainHtml !== null) {
      throw new Error(
        `Fetched ${hostname(url)} but couldn't extract readable text — the page may require JavaScript. ` +
        `Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_BROWSER_TOKEN to enable JS rendering.`
      );
    }
    throw new Error(`Could not fetch ${url} (HTTP ${plainStatus ?? "error"})`);
  }

  if (cfResult === null) {
    // Cloudflare is configured but also failed (bot-protected or error)
    if (plainStatus === 403 || plainStatus === 401) {
      throw new Error(
        `Access blocked — ${hostname(url)} actively blocks scrapers (including Cloudflare's browser). ` +
        `Try a specific article or blog post URL instead of a listing/landing page.`
      );
    }
    throw new Error(`Could not extract content from ${url} — the page may be login-gated or bot-protected.`);
  }

  // Cloudflare returned markdown — extract title from first # heading
  const titleMatch = cfResult.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : null;

  return { text: cfResult, imageUrl: null, title };
}

// Returns:
//   string        — markdown content on success
//   null          — configured but request failed
//   "not_configured" — env vars missing, skip silently
async function fetchWithCloudflareMarkdown(url: string): Promise<string | null | "not_configured"> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_BROWSER_TOKEN;
  if (!accountId || !token) return "not_configured";

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/markdown`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        gotoOptions: { waitUntil: "networkidle2" },
        ...(process.env.CLOUDFLARE_BYPASS_TOKEN
          ? { setExtraHTTPHeaders: { "x-internal-token": process.env.CLOUDFLARE_BYPASS_TOKEN } }
          : {}),
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) return null;

    const json = await res.json() as { success: boolean; result?: string };
    if (!json.success || !json.result || json.result.length < MIN_LENGTH) return null;

    return json.result;
  } catch {
    return null;
  }
}

function hostname(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

function extractWithReadability(
  html: string,
  url: string
): { text: string; title: string | null } | null {
  try {
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (!article?.textContent) return null;
    return {
      text: article.textContent.trim(),
      title: article.title?.trim() ?? null,
    };
  } catch {
    return null;
  }
}

function extractBbcFallback($: ReturnType<typeof load>): string | null {
  const paragraphs: string[] = [];
  $("[data-component='text-block'] p").each((_, el) => {
    const text = $(el).text().trim();
    if (text) paragraphs.push(text);
  });
  return paragraphs.length > 0 ? paragraphs.join("\n\n") : null;
}
