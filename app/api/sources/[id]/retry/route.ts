import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/db/server";
import { runSingleUrlIngest } from "@/lib/ingest/pipeline-url";
import { deleteChunksByUrl } from "@/lib/rag/pinecone";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabaseClient();

  const { data: source } = await admin
    .from("sources")
    .select("id, url, assistant_id, assistants!inner(owner_id, pinecone_namespace, max_chunks_per_source)")
    .eq("id", id)
    .single();

  if (!source) return Response.json({ error: "Not found" }, { status: 404 });

  const assistantInfo = source.assistants as unknown as {
    owner_id: string;
    pinecone_namespace: string;
    max_chunks_per_source: number | null;
  };
  if (assistantInfo.owner_id !== user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Wipe any orphaned vectors from a previous attempt before re-ingesting
  await deleteChunksByUrl(source.url, assistantInfo.pinecone_namespace);

  // Reset the row so the dashboard shows it as processing
  await admin
    .from("sources")
    .update({ status: "processing", error: null, chunk_count: 0, ingested_at: null })
    .eq("id", id);

  try {
    const result = await runSingleUrlIngest(
      source.id,
      source.assistant_id,
      source.url,
      assistantInfo.pinecone_namespace,
      assistantInfo.max_chunks_per_source ?? 50
    );
    return Response.json({ ok: true, sourceId: source.id, chunksUpserted: result.chunksUpserted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingest failed";
    return Response.json({ error: message, sourceId: source.id }, { status: 500 });
  }
}
