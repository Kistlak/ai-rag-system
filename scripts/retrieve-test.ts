import { retrieve, buildPrompt } from "../lib/rag/retrieve";

const query = process.argv.slice(2).find((a) => !a.startsWith("dotenv_config_"));
if (!query) {
  console.error("Usage: npm run retrieve:test <query>");
  process.exit(1);
}

async function main() {
  console.log(`Query: "${query}"\n`);
  const chunks = await retrieve(query, 5);

  if (chunks.length === 0) {
    console.log("No results above score floor.");
    return;
  }

  chunks.forEach((c, i) => {
    console.log(`[${i + 1}] score=${c.score.toFixed(3)}  ${c.title}`);
    console.log(`    ${c.articleUrl}`);
    console.log(`    "${c.text.slice(0, 120).replace(/\n/g, " ")}..."`);
    console.log();
  });

  const { system } = buildPrompt(query, chunks);
  console.log("--- buildPrompt output (first 300 chars) ---");
  console.log(system.slice(0, 300) + "...");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
