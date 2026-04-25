'use client';

import type { UIMessage, SourceUrlUIPart } from "ai";
import { isTextUIPart } from "ai";
import { Sparkles, ExternalLink, Newspaper } from "lucide-react";
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

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "bbc.com";
  }
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
        <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-md bg-gradient-to-br from-red-600 to-red-700 px-4 py-2.5 text-sm text-white whitespace-pre-wrap shadow-sm shadow-red-600/20">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 sm:gap-3">
      <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-red-700 shadow-sm shadow-red-600/30 mt-0.5">
        <Sparkles className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-3.5">
        {/* ── assistant text ── */}
        {text && (
          <div className="text-[15px] leading-relaxed text-foreground prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2.5 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="mb-2.5 list-disc pl-5 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="mb-2.5 list-decimal pl-5 space-y-1">{children}</ol>,
                li: ({ children }) => <li>{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                h1: ({ children }) => <h1 className="text-lg font-semibold mt-3 mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-1.5">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mt-2.5 mb-1">{children}</h3>,
                code: ({ children }) => (
                  <code className="rounded bg-muted px-1.5 py-0.5 text-[13px] font-mono">{children}</code>
                ),
                a: ({ children, href }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-red-500 dark:text-red-400 hover:underline underline-offset-2">
                    {children}
                  </a>
                ),
              }}
            >
              {text}
            </ReactMarkdown>
          </div>
        )}

        {/* ── source cards ── */}
        {sources.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Newspaper className="h-3.5 w-3.5" />
              <span>Sources</span>
              <span className="text-muted-foreground/50 font-normal normal-case tracking-normal">
                ({sources.length})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {sources.map((s, i) => {
                const { title, imageUrl } = parseSourceMeta(s);
                return (
                  <a
                    key={s.sourceId}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm hover:border-border hover:bg-card hover:-translate-y-0.5 hover:shadow-lg transition-all"
                  >
                    {imageUrl ? (
                      <div className="aspect-video overflow-hidden bg-muted shrink-0 relative">
                        <img
                          src={imageUrl}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-2 left-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm px-1.5 text-[10px] font-bold text-white tabular-nums">
                          {i + 1}
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-muted to-muted/40 flex items-center justify-center relative">
                        <Newspaper className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
                        <div className="absolute top-2 left-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm px-1.5 text-[10px] font-bold text-white tabular-nums">
                          {i + 1}
                        </div>
                      </div>
                    )}
                    <div className="p-3 flex flex-col gap-1.5 flex-1">
                      <p className="text-[13px] font-medium leading-snug line-clamp-2 text-foreground">
                        {title}
                      </p>
                      <div className="mt-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                        <span className="truncate">{hostname(s.url)}</span>
                        <ExternalLink className="h-3 w-3 ml-auto shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
