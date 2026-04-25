import { index, upsertChunks, queryByVector } from "../lib/rag/pinecone";

const SMOKE_ID = "smoke-test";
const DIM = 1536;

async function run() {
  const vector = Array(DIM).fill(0.01) as number[];
  const metadata = {
    articleUrl: "https://example.com/smoke",
    title: "Smoke test article",
    publishedAt: new Date().toISOString(),
    chunkIndex: 0,
    text: "hello world",
  };

  // Upsert
  await upsertChunks([{ id: SMOKE_ID, values: vector, metadata }]);
  console.log("✓ upserted");

  // Give Pinecone a moment to make the vector queryable
  await new Promise((r) => setTimeout(r, 5000));

  // Query
  const matches = await queryByVector(vector, 1);
  console.log("✓ queried");

  // Assert
  if (matches[0]?.id !== SMOKE_ID) {
    throw new Error(`Expected top match id="${SMOKE_ID}", got "${matches[0]?.id}"`);
  }
  console.log("✓ matched");

  // Cleanup
  await index.deleteOne({ id: SMOKE_ID });
  console.log("✓ cleaned up");

  console.log("\nSmoke test passed.");
}

run().catch((err) => {
  console.error("Smoke test FAILED:", err);
  process.exit(1);
});
