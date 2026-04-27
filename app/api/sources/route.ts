import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/db/server";
import { runSingleUrlIngest } from "@/lib/ingest/pipeline-url";
import { z } from "zod";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_URLS_PER_ASSISTANT = 10;

const BodySchema = z.object({
  assistantId: z.string().uuid(),
  url: z.string().url(),
});

export async function POST(req: Request) {
  // Auth check
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Parse body
  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { assistantId, url } = parsed.data;

  const admin = createAdminSupabaseClient();

  // Verify the assistant belongs to this user
  const { data: assistant } = await admin
    .from("assistants")
    .select("id, pinecone_namespace, system_prompt, max_chunks_per_source")
    .eq("id", assistantId)
    .eq("owner_id", user.id)
    .single();

  if (!assistant) {
    return Response.json({ error: "Assistant not found" }, { status: 404 });
  }

  // Check URL cap
  const { count } = await admin
    .from("sources")
    .select("*", { count: "exact", head: true })
    .eq("assistant_id", assistantId)
    .in("status", ["pending", "processing", "ready"]);

  if ((count ?? 0) >= MAX_URLS_PER_ASSISTANT) {
    return Response.json(
      { error: `Maximum ${MAX_URLS_PER_ASSISTANT} URLs per assistant` },
      { status: 422 }
    );
  }

  // Check for duplicate URL
  const { data: existing } = await admin
    .from("sources")
    .select("id, status")
    .eq("assistant_id", assistantId)
    .eq("url", url)
    .single();

  if (existing) {
    return Response.json(
      { error: "This URL has already been added", sourceId: existing.id, status: existing.status },
      { status: 409 }
    );
  }

  // Create the source row
  const { data: source, error: insertError } = await admin
    .from("sources")
    .insert({ assistant_id: assistantId, url, status: "pending" })
    .select("id")
    .single();

  if (insertError || !source) {
    return Response.json({ error: "Failed to create source" }, { status: 500 });
  }

  // Run ingest synchronously (single page fits within 60s)
  try {
    const result = await runSingleUrlIngest(
      source.id,
      assistantId,
      url,
      assistant.pinecone_namespace,
      assistant.max_chunks_per_source ?? 50
    );
    return Response.json({ ok: true, sourceId: source.id, chunksUpserted: result.chunksUpserted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingest failed";
    return Response.json({ error: message, sourceId: source.id }, { status: 500 });
  }
}
