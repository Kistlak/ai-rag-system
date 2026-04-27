import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/db/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import AssistantManager from "./AssistantManager";

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
      .select("id, url, title, status, chunk_count, ingested_at, created_at")
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

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight truncate">{assistant.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5 font-mono">/a/{assistant.slug}</p>
        </div>
        <button
          type="button"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          title="Rename (coming soon)"
          disabled
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
          Rename
        </button>
      </div>

      <AssistantManager
        assistant={assistant}
        initialSources={sources ?? []}
        shareUrl={shareUrl}
      />
    </div>
  );
}
