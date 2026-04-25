import Parser from "rss-parser";

const parser = new Parser();

export const BBC_FEEDS = [
  "http://feeds.bbci.co.uk/news/rss.xml",
  "http://feeds.bbci.co.uk/news/world/rss.xml",
  "http://feeds.bbci.co.uk/news/technology/rss.xml",
];

export interface RssItem {
  url: string;
  title: string;
  publishedAt: string;
}

export async function fetchAllRssItems(): Promise<RssItem[]> {
  const seen = new Set<string>();
  const items: RssItem[] = [];

  for (const feed of BBC_FEEDS) {
    try {
      const parsed = await parser.parseURL(feed);
      for (const item of parsed.items) {
        if (!item.link || !item.title || !item.pubDate) continue;
        if (seen.has(item.link)) continue;
        seen.add(item.link);
        items.push({
          url: item.link,
          title: item.title,
          publishedAt: new Date(item.pubDate).toISOString(),
        });
      }
    } catch (err) {
      console.warn(`[rss] failed to fetch ${feed}:`, err);
    }
  }

  return items;
}
