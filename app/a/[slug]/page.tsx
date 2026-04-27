import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/db/server";
import { notFound } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import Chat, { type ChatSummary, type PersistedMessage, type ChatUser } from "@/components/chat";
import PublicChatHeaderUser from "./PublicChatHeaderUser";
import { Sparkles } from "lucide-react";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("assistants")
    .select("name, description")
    .eq("slug", slug)
    .eq("is_public", true)
    .single();

  if (!data) return { title: "Assistant not found" };
  return {
    title: data.name,
    description: data.description ?? `AI assistant grounded in curated content.`,
  };
}

export default async function PublicChatPage({ params }: Props) {
  const { slug } = await params;
  const admin = createAdminSupabaseClient();

  const { data: assistant } = await admin
    .from("assistants")
    .select("id, name, description, is_public")
    .eq("slug", slug)
    .eq("is_public", true)
    .single();

  if (!assistant) notFound();

  // Resolve current viewer (optional)
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  let viewer: ChatUser | null = null;
  let initialChats: ChatSummary[] = [];
  let initialActiveChatId: string | null = null;
  let initialMessages: PersistedMessage[] = [];

  if (user?.email) {
    viewer = {
      id: user.id,
      email: user.email,
      initial: user.email[0]?.toUpperCase() ?? "?",
    };

    const { data: chats } = await supabase
      .from("chats")
      .select("id, title, created_at, updated_at")
      .eq("assistant_id", assistant.id)
      .order("updated_at", { ascending: false })
      .limit(50);

    initialChats = chats ?? [];

    if (initialChats.length > 0) {
      initialActiveChatId = initialChats[0].id;
      const { data: rows } = await supabase
        .from("chat_messages")
        .select("id, role, parts")
        .eq("chat_id", initialActiveChatId)
        .order("created_at", { ascending: true });

      initialMessages = (rows ?? []).map((r) => ({
        id: r.id,
        role: r.role as "user" | "assistant",
        parts: r.parts,
      }));
    }
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <header className="shrink-0 sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 h-[62px]">
          {/* Left: assistant identity */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] shadow-md shadow-[oklch(0.58_0.22_27/0.25)]">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2.2} />
              {/* Online dot */}
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-[15px] font-semibold tracking-tight text-foreground">{assistant.name}</h1>
                <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              </div>
              {assistant.description && (
                <p className="hidden sm:block truncate text-[11px] text-muted-foreground leading-tight mt-0.5">
                  {assistant.description}
                </p>
              )}
            </div>
          </div>

          {/* Right: attribution + theme + viewer */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-[oklch(0.58_0.22_27)]" strokeWidth={2.5} />
              Powered by{" "}
              <span className="font-medium text-[oklch(0.58_0.22_27)]">AskBase</span>
            </span>
            <ThemeToggle />
            <PublicChatHeaderUser viewer={viewer} slug={slug} />
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 w-full">
        <div className="flex flex-1 max-w-[1400px] w-full mx-auto px-3 sm:px-4 lg:px-6">
          <Chat
            assistantId={assistant.id}
            assistantName={assistant.name}
            viewer={viewer}
            initialChats={initialChats}
            initialActiveChatId={initialActiveChatId}
            initialMessages={initialMessages}
          />
        </div>
      </div>
    </main>
  );
}
