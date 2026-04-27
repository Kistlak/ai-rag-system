import { createServerSupabaseClient } from "@/lib/db/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ListSchema = z.object({
  assistantId: z.string().uuid(),
});

const CreateSchema = z.object({
  assistantId: z.string().uuid(),
  title: z.string().max(120).optional(),
});

export async function GET(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const parsed = ListSchema.safeParse({ assistantId: searchParams.get("assistantId") });
  if (!parsed.success) return Response.json({ error: "Invalid assistantId" }, { status: 400 });

  const { data, error } = await supabase
    .from("chats")
    .select("id, title, created_at, updated_at")
    .eq("assistant_id", parsed.data.assistantId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ chats: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid body" }, { status: 400 });

  // Verify assistant exists and is public (RLS allows reading public assistants)
  const { data: assistant } = await supabase
    .from("assistants")
    .select("id, is_public")
    .eq("id", parsed.data.assistantId)
    .single();

  if (!assistant || !assistant.is_public) {
    return Response.json({ error: "Assistant not found" }, { status: 404 });
  }

  const { data: chat, error } = await supabase
    .from("chats")
    .insert({
      assistant_id: parsed.data.assistantId,
      user_id: user.id,
      title: parsed.data.title ?? null,
    })
    .select("id, title, created_at, updated_at")
    .single();

  if (error || !chat) return Response.json({ error: "Failed to create chat" }, { status: 500 });

  return Response.json({ chat }, { status: 201 });
}
