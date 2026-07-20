import { useSyncExternalStore } from "react";

export type Role = "user" | "assistant";

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
}

export interface Thread {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  lastMessagePreview?: string;
}

interface ChatState {
  threads: Thread[];
  messages: Record<string, Message[]>;
}

const STORAGE_KEY = "chat.state.v1";
const listeners = new Set<() => void>();

let state: ChatState = { threads: [], messages: {} };
let hydrated = false;

function isBrowser() {
  return typeof window !== "undefined";
}

function persist() {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded etc — ignore */
  }
}

function hydrate() {
  if (hydrated || !isBrowser()) return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChatState;
      if (parsed && Array.isArray(parsed.threads) && parsed.messages) {
        state = parsed;
      }
    }
  } catch {
    /* corrupted — ignore */
  }
}

function emit() {
  for (const l of listeners) l();
}

function setState(updater: (prev: ChatState) => ChatState) {
  state = updater(state);
  persist();
  emit();
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function getSnapshot(): ChatState {
  hydrate();
  return state;
}

export function getServerSnapshot(): ChatState {
  return { threads: [], messages: {} };
}

export function useChatState<T>(selector: (s: ChatState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getServerSnapshot()),
  );
}

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function createThread(title = "Nova conversa"): Thread {
  const now = Date.now();
  const thread: Thread = { id: uid(), title, createdAt: now, updatedAt: now };
  setState((s) => ({
    ...s,
    threads: [thread, ...s.threads],
    messages: { ...s.messages, [thread.id]: [] },
  }));
  return thread;
}

export function ensureBootstrapThread(): Thread {
  hydrate();
  if (state.threads.length > 0) return state.threads[0];
  return createThread();
}

export function renameThread(id: string, title: string) {
  setState((s) => ({
    ...s,
    threads: s.threads.map((t) => (t.id === id ? { ...t, title, updatedAt: Date.now() } : t)),
  }));
}

export function deleteThread(id: string) {
  setState((s) => {
    const { [id]: _, ...rest } = s.messages;
    return { ...s, threads: s.threads.filter((t) => t.id !== id), messages: rest };
  });
}

export function appendMessage(threadId: string, role: Role, content: string): Message {
  const msg: Message = { id: uid(), role, content, createdAt: Date.now() };
  setState((s) => {
    const list = s.messages[threadId] ?? [];
    const nextList = [...list, msg];
    const preview = content.replace(/\s+/g, " ").slice(0, 80);
    const threads = s.threads.map((t) =>
      t.id === threadId
        ? {
            ...t,
            updatedAt: msg.createdAt,
            lastMessagePreview: preview,
            title:
              t.title === "Nova conversa" && role === "user"
                ? content.slice(0, 40).trim() || t.title
                : t.title,
          }
        : t,
    );
    // resort by updatedAt desc
    threads.sort((a, b) => b.updatedAt - a.updatedAt);
    return { ...s, threads, messages: { ...s.messages, [threadId]: nextList } };
  });
  return msg;
}
