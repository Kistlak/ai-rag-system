import { load } from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface ArticleResult {
  text: string;
  imageUrl: string | null;
}

export async function fetchArticle(url: string): Promise<ArticleResult | null> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);

  const html = await res.text();
  const $ = load(html);

  const paragraphs: string[] = [];
  $("[data-component='text-block'] p").each((_, el) => {
    const text = $(el).text().trim();
    if (text) paragraphs.push(text);
  });

  const text = paragraphs.join("\n\n").trim();
  if (text.length < 200) return null;

  const imageUrl =
    $('meta[property="og:image"]').attr("content") ??
    $('meta[name="og:image"]').attr("content") ??
    null;

  return { text, imageUrl };
}
