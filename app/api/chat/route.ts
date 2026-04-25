import {
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { z } from "zod";
import { retrieve, buildPrompt } from "@/lib/rag/retrieve";
import { getModel } from "@/lib/llm";

export const maxDuration = 30;

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const FALLBACK =
  "I couldn't find anything in BBC coverage on that. Try rephrasing or asking about a different recent story.";
const FALLBACK_ID = "no-context";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = z
    .object({ messages: z.array(MessageSchema).min(1) })
    .safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { messages } = parsed.data;
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== "user") {
    return Response.json(
      { error: "Last message must be from user" },
      { status: 400 }
    );
  }

  const chunks = await retrieve(lastMessage.content, 5);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      if (chunks.length === 0) {
        writer.write({ type: "text-start", id: FALLBACK_ID });
        writer.write({ type: "text-delta", id: FALLBACK_ID, delta: FALLBACK });
        writer.write({ type: "text-end", id: FALLBACK_ID });
        return;
      }

      const { system } = buildPrompt(lastMessage.content, chunks);

      const result = streamText({
        model: getModel(),
        system,
        messages,
      });

      // Write source-url parts so the UI receives them alongside the text
      chunks.forEach((chunk, i) => {
        writer.write({
          type: "source-url",
          sourceId: `source-${i}`,
          url: chunk.articleUrl,
          title: chunk.title,
        });
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}
