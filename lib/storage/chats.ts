'use client';

import type { UIMessage } from "ai";
import { isTextUIPart } from "ai";

const KEY = "bbc-chats-v1";
const MAX_CHATS = 50;

export interface ChatRecord {
  id: string;
  title: string;
  messages: UIMessage[];
  createdAt: number;
  updatedAt: number;
}

function safeParse(raw: string | null): ChatRecord[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadChats(): ChatRecord[] {
  if (typeof window === "undefined") return [];
  return safeParse(localStorage.getItem(KEY));
}

export function saveChats(chats: ChatRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(chats));
  } catch {
    // Quota exceeded — drop oldest half and retry
    try {
      localStorage.setItem(KEY, JSON.stringify(chats.slice(0, Math.floor(chats.length / 2))));
    } catch {}
  }
}

export function getChat(id: string): ChatRecord | undefined {
  return loadChats().find((c) => c.id === id);
}

export function upsertChat(chat: ChatRecord): void {
  const existing = loadChats();
  const filtered = existing.filter((c) => c.id !== chat.id);
  filtered.unshift(chat); // most recently updated first
  saveChats(filtered.slice(0, MAX_CHATS));
}

export function deleteChat(id: string): void {
  saveChats(loadChats().filter((c) => c.id !== id));
}

export function chatTitle(messages: UIMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New chat";
  const text = firstUser.parts
    .filter(isTextUIPart)
    .map((p) => p.text)
    .join("")
    .trim();
  if (!text) return "New chat";
  return text.length > 60 ? `${text.slice(0, 60).trim()}…` : text;
}

export function generateChatId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function relativeTimeGroup(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return "Previous 7 days";
  if (diff < 30 * day) return "Previous 30 days";
  return "Older";
}
