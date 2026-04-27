import { createServerSupabaseClient } from "@/lib/db/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // RLS scopes both queries to the user's own chats
  const { data: chat } = await supabase
    .from("chats")
    .select("id, title")
    .eq("id", id)
    .single();

  if (!chat) return Response.json({ error: "Chat not found" }, { status: 404 });

  const { data: rows, error } = await supabase
    .from("chat_messages")
    .select("id, role, parts, created_at")
    .eq("chat_id", id)
    .order("created_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Re-shape into UIMessage format the AI SDK expects
  const messages = (rows ?? []).map((r) => ({
    id: r.id,
    role: r.role,
    parts: r.parts,
  }));

  return Response.json({ chat, messages });
}
