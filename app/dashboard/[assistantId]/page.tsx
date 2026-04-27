import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/db/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot } from "lucide-react";
import AssistantManager from "./AssistantManager";
import AssistantNameEditor from "./AssistantNameEditor";

interface Props {
  params: Promise<{ assistantId: string }>;
}

export default async function AssistantDetailPage({ params }: Props) {
  const { assistantId } = await params;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const admin = createAdminSupabaseClient();

  const [{ data: assistant }, { data: sources }] = await Promise.all([
    admin
      .from("assistants")
      .select("id, name, slug, description, system_prompt, is_public, max_chunks_per_source")
      .eq("id", assistantId)
      .eq("owner_id", user.id)
      .single(),
    admin
      .from("sources")
      .select("id, url, title, status, chunk_count, ingested_at, created_at, error")
      .eq("assistant_id", assistantId)
      .order("created_at", { ascending: false }),
  ]);

  if (!assistant) notFound();

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const shareUrl = `${origin}/a/${assistant.slug}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Dashboard
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[oklch(0.62_0.23_27)] to-[oklch(0.48_0.21_27)] shadow-md shadow-[oklch(0.58_0.22_27/0.3)]">
          <Bot className="h-5 w-5 text-white" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <AssistantNameEditor assistantId={assistant.id} initialName={assistant.name} />
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">/a/{assistant.slug}</p>
        </div>
      </div>

      <AssistantManager
        assistant={assistant}
        initialSources={sources ?? []}
        shareUrl={shareUrl}
      />
    </div>
  );
}
