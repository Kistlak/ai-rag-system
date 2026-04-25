'use client';

import type { UIMessage, SourceUrlUIPart } from "ai";
import { isTextUIPart } from "ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  message: UIMessage;
}

function parseSourceMeta(s: SourceUrlUIPart): { title: string; imageUrl: string | null } {
  try {
    const parsed = JSON.parse(s.title ?? "");
    if (parsed && typeof parsed === "object" && "t" in parsed) {
      return {
        title: String(parsed.t ?? ""),
        imageUrl: parsed.i ? String(parsed.i) : null,
      };
    }
  } catch {}
  return { title: s.title ?? s.url, imageUrl: null };
}

export default function Message({ message }: Props) {
  const text = message.parts
    .filter(isTextUIPart)
    .map((p) => p.text)
    .join("");

  const sources = message.parts.filter(
    (p): p is SourceUrlUIPart => p.type === "source-url"
  );

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl bg-red-600/90 px-4 py-2.5 text-sm text-white whitespace-pre-wrap">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── assistant text ── */}
      <div className="max-w-[92%] text-sm leading-relaxed text-foreground">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            ul: ({ children }) => <ul className="mb-2 list-disc pl-4">{children}</ul>,
            ol: ({ children }) => <ol className="mb-2 list-decimal pl-4">{children}</ol>,
            li: ({ children }) => <li className="mb-0.5">{children}</li>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            code: ({ children }) => (
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{children}</code>
            ),
          }}
        >
          {text}
        </ReactMarkdown>
      </div>

      {/* ── source cards ── */}
      {sources.length > 0 && (
        <div className="max-w-[92%]">
          <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Sources
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {sources.map((s, i) => {
              const { title, imageUrl } = parseSourceMeta(s);
              return (
                <a
                  key={s.sourceId}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card hover:border-border hover:bg-card/80 transition-all"
                >
                  {imageUrl && (
                    <div className="aspect-video overflow-hidden bg-muted shrink-0">
                      <img
                        src={imageUrl}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-2.5 flex flex-col gap-1">
                    <p className="text-xs font-medium leading-snug line-clamp-2 text-foreground">
                      {title}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="shrink-0">{i + 1}.</span>
                      <span className="truncate">bbc.com</span>
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
