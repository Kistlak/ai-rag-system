import { createAdminSupabaseClient } from "@/lib/db/server";
import { notFound } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import Chat from "@/components/chat";
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

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <header className="shrink-0 sticky top-0 z-20 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] shadow-lg shadow-red-600/25">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2.2} />
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            </div>
            <div className="min-w-0">
              <h1 className="text-[15px] font-semibold leading-tight tracking-tight truncate">
                {assistant.name}
              </h1>
              {assistant.description && (
                <p className="hidden sm:block text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
                  {assistant.description}
                </p>
              )}
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden w-full">
        <div className="flex flex-1 max-w-4xl lg:max-w-[1400px] w-full mx-auto px-3 sm:px-4 lg:px-6">
          <Chat assistantId={assistant.id} />
        </div>
      </div>
    </main>
  );
}
