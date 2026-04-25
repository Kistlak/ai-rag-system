'use client';

import { Plus, MessageSquare, Trash2, X, PanelLeftClose } from "lucide-react";
import { useMemo } from "react";
import { ThemeToggle } from "./theme-toggle";
import { relativeTimeGroup, type ChatRecord } from "@/lib/storage/chats";

interface Props {
  chats: ChatRecord[];
  currentId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({
  chats,
  currentId,
  onSelect,
  onNew,
  onDelete,
  open,
  onClose,
}: Props) {
  const grouped = useMemo(() => {
    const groups: Record<string, ChatRecord[]> = {};
    for (const chat of chats) {
      const key = relativeTimeGroup(chat.updatedAt);
      (groups[key] ||= []).push(chat);
    }
    const order = ["Today", "Yesterday", "Previous 7 days", "Previous 30 days", "Older"];
    return order.filter((k) => groups[k]?.length).map((k) => ({ label: k, items: groups[k] }));
  }, [chats]);

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden
      />

      {/* Sidebar */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 z-40
          h-dvh w-[270px] shrink-0
          flex flex-col
          bg-card/30 dark:bg-card/20 backdrop-blur-2xl
          border-r border-border/40
          transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0
        `}
      >
        {/* Brand + close (mobile) */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-3 pt-3 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center justify-center rounded-md bg-gradient-to-br from-red-600 to-red-700 px-2 py-0.5 text-[11px] font-bold text-white tracking-widest shadow-sm shadow-red-600/30">
              BBC
            </div>
            <span className="text-sm font-semibold truncate">News Assistant</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="md:hidden inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* New chat */}
        <div className="shrink-0 px-3 pb-2">
          <button
            type="button"
            onClick={onNew}
            className="w-full flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-3 py-2.5 text-sm font-medium hover:bg-card hover:border-border transition-all active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            <span>New chat</span>
          </button>
        </div>

        {/* Chat list */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-1">
          {chats.length === 0 ? (
            <div className="px-2 py-8 text-center">
              <MessageSquare
                className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2"
                strokeWidth={1.5}
              />
              <p className="text-xs text-muted-foreground/70">
                Your conversations will appear here
              </p>
            </div>
          ) : (
            grouped.map(({ label, items }) => (
              <div key={label} className="mb-3">
                <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">
                  {label}
                </p>
                <ul className="space-y-0.5">
                  {items.map((chat) => {
                    const active = chat.id === currentId;
                    return (
                      <li key={chat.id}>
                        <div
                          className={`group relative flex items-center rounded-lg transition-colors ${
                            active
                              ? "bg-card/80 border border-border/60"
                              : "hover:bg-card/50 border border-transparent"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => onSelect(chat.id)}
                            className="flex-1 min-w-0 flex items-center gap-2 px-2 py-2 text-sm text-left"
                          >
                            <MessageSquare
                              className={`h-3.5 w-3.5 shrink-0 ${
                                active ? "text-foreground" : "text-muted-foreground"
                              }`}
                              strokeWidth={2}
                            />
                            <span className="truncate">{chat.title}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(chat.id);
                            }}
                            aria-label="Delete chat"
                            className="shrink-0 p-1.5 mr-1 rounded-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted-foreground hover:text-red-500 hover:bg-muted transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-border/40 px-3 py-2.5 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Appearance</span>
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}

export function SidebarToggle({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      aria-label="Open sidebar"
    >
      <PanelLeftClose className="h-5 w-5 rotate-180" strokeWidth={2} />
    </button>
  );
}
