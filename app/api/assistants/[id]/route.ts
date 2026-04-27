import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/db/server";
import { deleteNamespace } from "@/lib/rag/pinecone";
import { z } from "zod";

const VALID_CHUNK_LIMITS = [10, 25, 50, 100, 200] as const;

const PatchSchema = z.object({
  name: z.string().min(1).max(80).trim().optional(),
  description: z.string().max(280).trim().optional(),
  system_prompt: z.string().max(2000).trim().nullable().optional(),
  is_public: z.boolean().optional(),
  max_chunks_per_source: z.number().refine(
    (v) => (VALID_CHUNK_LIMITS as readonly number[]).includes(v),
    { message: "Must be one of: 10, 25, 50, 100, 200" }
  ).optional(),
});

async function getOwned(req: Request, id: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, assistant: null };

  const admin = createAdminSupabaseClient();
  const { data: assistant } = await admin
    .from("assistants")
    .select("id, owner_id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  return { user, assistant };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, assistant } = await getOwned(req, id);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!assistant) return Response.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid fields" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("assistants")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return Response.json({ error: "Update failed" }, { status: 500 });
  return Response.json({ ok: true, assistant: data });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, assistant } = await getOwned(req, id);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!assistant) return Response.json({ error: "Not found" }, { status: 404 });

  const admin = createAdminSupabaseClient();

  // Look up the namespace before delete so we can clean Pinecone afterwards
  const { data: full } = await admin
    .from("assistants")
    .select("pinecone_namespace")
    .eq("id", id)
    .single();

  const { error } = await admin.from("assistants").delete().eq("id", id);
  if (error) return Response.json({ error: "Delete failed" }, { status: 500 });

  if (full?.pinecone_namespace) {
    await deleteNamespace(full.pinecone_namespace);
  }

  return Response.json({ ok: true });
}
