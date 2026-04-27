import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  convertToModelMessages,
  isTextUIPart,
  type UIMessage,
} from "ai";
import { headers } from "next/headers";
import { z } from "zod";
import { retrieve, buildPrompt } from "@/lib/rag/retrieve";
import { getModel } from "@/lib/llm";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/db/server";
import { isRateLimited } from "@/lib/rate-limit";

export const maxDuration = 30;

const FALLBACK = "I couldn't find anything relevant in the indexed sources. If you just added a URL, check the dashboard to confirm it was indexed successfully — JavaScript-rendered pages (like TMDB, Netflix, etc.) can't be scraped and will show as Failed. Try rephrasing, or add a static article or blog post URL.";
const FALLBACK_ID = "no-context";

// ── Schema ───────────────────────────────────────────────────────────────────
const UIMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(z.any()),
  metadata: z.unknown().optional(),
});

const BodySchema = z.object({
  messages: z.array(UIMessageSchema).min(1),
  assistantId: z.string().uuid().optional(),
  chatId: z.string().uuid().optional(),
});

interface SourcePart {
  type: "source-url";
  sourceId: string;
  url: string;
  title: string;
}

export async function POST(req: Request) {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  let body: unknown;
  try { body = await req.json(); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { messages, assistantId, chatId } = parsed.data;
  const rateLimitKey = `${assistantId ?? "default"}:${ip}`;

  if (await isRateLimited(rateLimitKey)) {
    return Response.json({ error: "Too many requests" }, {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }

  const uiMessages = messages as UIMessage[];
  const lastMessage = uiMessages[uiMessages.length - 1];
  if (lastMessage.role !== "user") {
    return Response.json({ error: "Last message must be from user" }, { status: 400 });
  }

  const queryText = lastMessage.parts.filter(isTextUIPart).map((p) => p.text).join("");
  if (!queryText.trim()) {
    return Response.json({ error: "Empty message" }, { status: 400 });
  }

  // Resolve namespace + system prompt from assistantId if provided
  let namespace: string | undefined;
  let systemPromptOverride: string | null | undefined;

  if (assistantId) {
    const admin = createAdminSupabaseClient();
    const { data: assistant } = await admin
      .from("assistants")
      .select("pinecone_namespace, system_prompt, is_public")
      .eq("id", assistantId)
      .eq("is_public", true)
      .single();

    if (!assistant) {
      return Response.json({ error: "Assistant not found" }, { status: 404 });
    }

    namespace = assistant.pinecone_namespace;
    systemPromptOverride = assistant.system_prompt;
  }

  // ── Resolve persistence target (chatId) — only when user is signed in ─────
  let validatedChatId: string | null = null;
  if (chatId) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: chat } = await supabase
        .from("chats")
        .select("id, title")
        .eq("id", chatId)
        .single();
      if (chat) {
        validatedChatId = chat.id;
        // Auto-set title from first user message when missing
        if (!chat.title) {
          const admin = createAdminSupabaseClient();
          await admin
            .from("chats")
            .update({ title: queryText.slice(0, 80) })
            .eq("id", chat.id);
        }
        // Persist user message immediately
        const admin = createAdminSupabaseClient();
        await admin.from("chat_messages").insert({
          chat_id: chat.id,
          role: "user",
          parts: lastMessage.parts,
        });
      }
    }
  }

  let chunks: Awaited<ReturnType<typeof retrieve>>;
  try {
    chunks = await retrieve(queryText, 5, namespace);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Retrieval failed";
    return Response.json({ error: msg }, { status: 502 });
  }

  async function persistAssistantMessage(
    sourceParts: SourcePart[],
    text: string,
    usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number }
  ) {
    if (!validatedChatId) return;
    const admin = createAdminSupabaseClient();
    const parts = [
      ...sourceParts,
      { type: "text", text },
    ];
    await admin.from("chat_messages").insert({
      chat_id: validatedChatId,
      role: "assistant",
      parts,
      usage: usage ?? null,
    });
    await admin
      .from("chats")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", validatedChatId);
  }

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      if (chunks.length === 0) {
        writer.write({ type: "text-start", id: FALLBACK_ID });
        writer.write({ type: "text-delta", id: FALLBACK_ID, delta: FALLBACK });
        writer.write({ type: "text-end", id: FALLBACK_ID });
        await persistAssistantMessage([], FALLBACK);
        return;
      }

      const { system } = buildPrompt(queryText, chunks, systemPromptOverride);
      const modelMessages = await convertToModelMessages(uiMessages);

      const sourceParts: SourcePart[] = [];
      const seenUrls = new Set<string>();
      chunks.forEach((chunk, i) => {
        if (seenUrls.has(chunk.articleUrl)) return;
        seenUrls.add(chunk.articleUrl);
        const part: SourcePart = {
          type: "source-url",
          sourceId: `source-${i}`,
          url: chunk.articleUrl,
          title: JSON.stringify({ t: chunk.title, i: chunk.imageUrl ?? "" }),
        };
        sourceParts.push(part);
        writer.write(part);
      });

      const result = streamText({
        model: getModel(),
        system,
        messages: modelMessages,
        onFinish: async ({ text, usage }) => {
          await persistAssistantMessage(sourceParts, text, {
            inputTokens: usage?.inputTokens,
            outputTokens: usage?.outputTokens,
            totalTokens: usage?.totalTokens,
          });
        },
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}
