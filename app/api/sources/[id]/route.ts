import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/db/server";
import { deleteChunksByUrl } from "@/lib/rag/pinecone";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminSupabaseClient();

  // Fetch source + assistant to verify ownership and get namespace
  const { data: source } = await admin
    .from("sources")
    .select("id, url, assistant_id, assistants!inner(owner_id, pinecone_namespace)")
    .eq("id", id)
    .single();

  if (!source) return Response.json({ error: "Not found" }, { status: 404 });

  const assistantInfo = (source.assistants as unknown as { owner_id: string; pinecone_namespace: string });
  if (assistantInfo.owner_id !== user.id) {
    return Response.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Clean up Pinecone vectors for this URL
  await deleteChunksByUrl(source.url, assistantInfo.pinecone_namespace);

  const { error } = await admin.from("sources").delete().eq("id", id);
  if (error) return Response.json({ error: "Delete failed" }, { status: 500 });

  return Response.json({ ok: true });
}
