import { createServerSupabaseClient } from "@/lib/db/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const PatchSchema = z.object({
  title: z.string().min(1).max(120).trim(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid title" }, { status: 400 });

  // RLS scopes the update to the user's own chats
  const { data: chat, error } = await supabase
    .from("chats")
    .update({ title: parsed.data.title, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, title, created_at, updated_at")
    .single();

  if (error || !chat) return Response.json({ error: "Update failed" }, { status: 500 });

  return Response.json({ chat });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // RLS scopes the delete to the user's own chats — cascades to chat_messages
  const { error } = await supabase.from("chats").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
