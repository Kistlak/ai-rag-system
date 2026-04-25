import { runIngest } from "../lib/ingest/pipeline";

async function main() {
  console.log("[ingest] starting local ingest...\n");
  const summary = await runIngest();
  console.log(
    `\n[ingest] done — ${summary.articlesIndexed} articles indexed, ` +
      `${summary.chunksUpserted} chunks upserted, ${summary.skipped} skipped`
  );
}

main().catch((err) => {
  console.error("[ingest] fatal:", err);
  process.exit(1);
});
