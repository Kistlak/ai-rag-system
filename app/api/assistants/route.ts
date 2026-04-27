import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/db/server";
import { generateSlug } from "@/lib/slug";
import { z } from "zod";
import { randomUUID } from "crypto";

const BodySchema = z.object({
  name: z.string().min(1).max(80).trim(),
});

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Name is required (max 80 chars)" }, { status: 400 });
  }

  const { name } = parsed.data;
  const admin = createAdminSupabaseClient();

  async function tryInsert(slug: string) {
    return admin
      .from("assistants")
      .insert({ owner_id: user!.id, name, slug, pinecone_namespace: randomUUID() })
      .select()
      .single();
  }

  let { data: assistant, error } = await tryInsert(generateSlug(name));

  // Retry once on slug collision (unique constraint)
  if (error?.code === "23505") {
    ({ data: assistant, error } = await tryInsert(generateSlug(name)));
  }

  if (error || !assistant) {
    return Response.json({ error: "Failed to create assistant" }, { status: 500 });
  }

  return Response.json({ ok: true, assistant }, { status: 201 });
}
