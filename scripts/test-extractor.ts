import { fetchArticle } from "../lib/ingest/article";

const TEST_URLS = [
  "https://www.bbc.com/news",                                      // BBC news homepage
  "https://apnews.com/",                                           // AP News homepage
  "https://www.theguardian.com/uk",                                // Guardian
  "https://en.wikipedia.org/wiki/Retrieval-augmented_generation",  // Wikipedia
  "https://nextjs.org/blog/next-15",                               // Tech blog
];

async function main() {
  console.log("Testing generic article extractor across sites...\n");

  for (const url of TEST_URLS) {
    process.stdout.write(`Fetching: ${url}\n`);
    try {
      const result = await fetchArticle(url);
      if (!result) {
        console.log(`  ✗ returned null (too short or unextractable)\n`);
      } else {
        console.log(`  ✓ title:    ${result.title ?? "(none)"}`);
        console.log(`  ✓ chars:    ${result.text.length}`);
        console.log(`  ✓ image:    ${result.imageUrl ?? "(none)"}`);
        console.log(`  ✓ preview:  ${result.text.slice(0, 120).replace(/\s+/g, " ")}…\n`);
      }
    } catch (err) {
      console.log(`  ✗ error: ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }
}

main();
