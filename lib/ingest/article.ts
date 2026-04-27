import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { load } from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const MIN_LENGTH = 200;

export interface ArticleResult {
  text: string;
  imageUrl: string | null;
  title: string | null;
}

export async function fetchArticle(url: string): Promise<ArticleResult | null> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);

  const html = await res.text();
  const $ = load(html);

  // og:image and og:title work on virtually all news sites
  const imageUrl =
    $('meta[property="og:image"]').attr("content") ??
    $('meta[name="og:image"]').attr("content") ??
    null;

  const metaTitle =
    $('meta[property="og:title"]').attr("content") ??
    $("title").first().text().trim() ??
    null;

  // Primary: Readability — works on ~95% of article pages
  const readability = extractWithReadability(html, url);
  if (readability && readability.text.length >= MIN_LENGTH) {
    return {
      text: readability.text,
      imageUrl,
      title: readability.title ?? metaTitle,
    };
  }

  // Fallback: BBC-specific selector (keeps existing pipeline working)
  const bbcText = extractBbcFallback($);
  if (bbcText && bbcText.length >= MIN_LENGTH) {
    return { text: bbcText, imageUrl, title: metaTitle };
  }

  return null;
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
