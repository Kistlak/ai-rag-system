import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/db/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Bot, FileText, MessageSquare, ArrowRight, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

interface AssistantStat {
  id: string;
  name: string;
  slug: string;
  source_count: number;
  ready_count: number;
  chunk_total: number;
  chat_count: number;
  message_count: number;
  input_tokens: number;
  output_tokens: number;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default async function UsagePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const admin = createAdminSupabaseClient();

  const { data: assistants } = await admin
    .from("assistants")
    .select("id, name, slug")
    .eq("owner_id", user.id);

  const assistantIds = (assistants ?? []).map((a) => a.id);

  let stats: AssistantStat[] = [];

  if (assistantIds.length > 0) {
    const [sourcesRes, chatsRes] = await Promise.all([
      admin.from("sources").select("assistant_id, status, chunk_count").in("assistant_id", assistantIds),
      admin.from("chats").select("id, assistant_id").in("assistant_id", assistantIds),
    ]);

    const chatIds = (chatsRes.data ?? []).map((c) => c.id);
    const messagesRes = chatIds.length > 0
      ? await admin.from("chat_messages").select("chat_id, usage").in("chat_id", chatIds)
      : { data: [] as { chat_id: string; usage: { inputTokens?: number; outputTokens?: number } | null }[] };

    const messagesByChat = new Map<string, number>();
    const inputTokensByChat = new Map<string, number>();
    const outputTokensByChat = new Map<string, number>();
    (messagesRes.data ?? []).forEach((m) => {
      messagesByChat.set(m.chat_id, (messagesByChat.get(m.chat_id) ?? 0) + 1);
      const u = m.usage as { inputTokens?: number; outputTokens?: number } | null;
      if (u?.inputTokens) inputTokensByChat.set(m.chat_id, (inputTokensByChat.get(m.chat_id) ?? 0) + u.inputTokens);
      if (u?.outputTokens) outputTokensByChat.set(m.chat_id, (outputTokensByChat.get(m.chat_id) ?? 0) + u.outputTokens);
    });

    stats = (assistants ?? []).map((a) => {
      const sources = (sourcesRes.data ?? []).filter((s) => s.assistant_id === a.id);
      const chats = (chatsRes.data ?? []).filter((c) => c.assistant_id === a.id);
      const messages = chats.reduce((acc, c) => acc + (messagesByChat.get(c.id) ?? 0), 0);
      const inputTokens = chats.reduce((acc, c) => acc + (inputTokensByChat.get(c.id) ?? 0), 0);
      const outputTokens = chats.reduce((acc, c) => acc + (outputTokensByChat.get(c.id) ?? 0), 0);
      return {
        id: a.id,
        name: a.name,
        slug: a.slug,
        source_count: sources.length,
        ready_count: sources.filter((s) => s.status === "ready").length,
        chunk_total: sources.reduce((acc, s) => acc + (s.chunk_count ?? 0), 0),
        chat_count: chats.length,
        message_count: messages,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      };
    });
  }

  const totals = stats.reduce(
    (acc, s) => ({
      assistants: acc.assistants + 1,
      sources: acc.sources + s.source_count,
      chunks: acc.chunks + s.chunk_total,
      chats: acc.chats + s.chat_count,
      messages: acc.messages + s.message_count,
      tokens: acc.tokens + s.input_tokens + s.output_tokens,
    }),
    { assistants: 0, sources: 0, chunks: 0, chats: 0, messages: 0, tokens: 0 }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-foreground">Usage</h1>
        <p className="mt-1 text-sm text-muted-foreground">Across all your assistants.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Assistants"  value={String(totals.assistants)} Icon={Bot} />
        <StatCard label="Sources"     value={String(totals.sources)}    Icon={FileText} />
        <StatCard label="Chats"       value={String(totals.chats)}      Icon={MessageSquare} />
        <StatCard label="Messages"    value={String(totals.messages)}   Icon={MessageSquare} />
        <StatCard label="Tokens"      value={formatTokens(totals.tokens)} Icon={Zap} />
      </div>

      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold text-foreground">Per assistant</h2>
        {stats.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-14 text-center">
            <p className="text-sm text-muted-foreground">No assistants yet.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left">
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Assistant</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground tabular-nums">Sources</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground tabular-nums">Chunks</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground tabular-nums">Chats</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground tabular-nums">Messages</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground tabular-nums">Tokens (in/out)</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{s.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">/a/{s.slug}</p>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-foreground">
                      {s.ready_count}<span className="text-muted-foreground">/{s.source_count}</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-foreground">{s.chunk_total}</td>
                    <td className="px-4 py-3 tabular-nums text-foreground">{s.chat_count}</td>
                    <td className="px-4 py-3 tabular-nums text-foreground">{s.message_count}</td>
                    <td className="px-4 py-3 tabular-nums text-foreground">
                      {formatTokens(s.input_tokens)}<span className="text-muted-foreground"> / </span>{formatTokens(s.output_tokens)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/${s.id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        Manage <ArrowRight className="h-3 w-3" strokeWidth={2.4} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, Icon }: { label: string; value: string; Icon: typeof Bot }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1.5 text-[28px] font-bold tabular-nums text-foreground leading-none">{value}</p>
    </div>
  );
}
