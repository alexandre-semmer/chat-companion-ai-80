import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  MoreHorizontal,
  Trash2,
  Download,
  Pencil,
  Sparkles,
  Bot,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  appendMessage,
  deleteThread,
  renameThread,
  updateMessageContent,
  useChatState,
} from "@/lib/chat-store";
import { streamOllamaChat, type OllamaMessage } from "@/lib/ollama-client";
import { Markdown } from "./Markdown";
import { Composer } from "./Composer";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const SUGGESTIONS = [
  { title: "Explique um conceito", body: "Explique computação quântica como se eu tivesse 12 anos." },
  { title: "Escreva algo", body: "Escreva um e-mail curto de agradecimento após uma entrevista." },
  { title: "Debug de código", body: "Por que este trecho em TypeScript retorna undefined?\n\n```ts\nconst users = [{ id: 1 }];\nconst u = users.find(u => u.id === '1');\n```" },
  { title: "Faça um plano", body: "Monte um plano de 7 dias para começar a correr do zero." },
];

interface Props {
  threadId: string;
}

export function ChatWindow({ threadId }: Props) {
  const thread = useChatState((s) => s.threads.find((t) => t.id === threadId));
  const messages = useChatState((s) => s.messages[threadId] ?? []);
  const [isTyping, setIsTyping] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(thread?.title ?? "");
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setTitleDraft(thread?.title ?? "");
  }, [thread?.title]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isTyping]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  if (!thread) {
    return (
      <div className="grid h-full place-items-center p-8 text-center text-muted-foreground">
        <div>
          <p className="text-sm">Esta conversa não existe mais.</p>
          <Button variant="link" onClick={() => navigate({ to: "/" })}>
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  const handleSend = async (text: string) => {
    appendMessage(threadId, "user", text);
    setIsTyping(true);

    const assistantMsg = appendMessage(threadId, "assistant", "");
    const accumulated = { current: "" };
    abortControllerRef.current = new AbortController();

    const history: OllamaMessage[] = [
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: text },
    ];

    try {
      await streamOllamaChat({
        model: "llama3.2",
        messages: history,
        signal: abortControllerRef.current.signal,
        onChunk: (chunk) => {
          accumulated.current += chunk;
          updateMessageContent(threadId, assistantMsg.id, accumulated.current);
        },
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        updateMessageContent(
          threadId,
          assistantMsg.id,
          `${accumulated.current}\n\n_(resposta interrompida)_`,
        );
      } else {
        const errMsg = error instanceof Error ? error.message : String(error);
        updateMessageContent(threadId, assistantMsg.id, `Erro ao chamar Ollama: ${errMsg}`);
      }
    } finally {
      abortControllerRef.current = null;
      setIsTyping(false);
    }
  };

  const handleExport = () => {
    const lines = messages
      .map((m) => `## ${m.role === "user" ? "Você" : "Assistente"}\n\n${m.content}`)
      .join("\n\n---\n\n");
    const blob = new Blob([`# ${thread.title}\n\n${lines}`], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${thread.title.replace(/[^a-z0-9]+/gi, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    // Clear = delete all messages by recreating the thread's message list
    // We do this by deleting and recreating? Simpler: append no-op and rely on ...
    // Implement clear via direct state — use deleteThread + navigate would lose thread. Instead:
    // simplest: iterate messages and skip. We'll add a helper below via appendMessage isn't enough.
    // Use a soft approach: navigate away, delete, create new. Keeping simple: just remove all messages.
    // We'll modify by using a small custom path:
    const key = "chat.state.v1";
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      parsed.messages[threadId] = [];
      parsed.threads = parsed.threads.map((t: { id: string; lastMessagePreview?: string }) =>
        t.id === threadId ? { ...t, lastMessagePreview: "" } : t,
      );
      window.localStorage.setItem(key, JSON.stringify(parsed));
      window.location.reload();
    } catch {
      /* noop */
    }
  };

  const commitTitle = () => {
    const next = titleDraft.trim();
    if (next && next !== thread.title) renameThread(thread.id, next);
    setEditingTitle(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle();
                if (e.key === "Escape") {
                  setTitleDraft(thread.title);
                  setEditingTitle(false);
                }
              }}
              className="w-full max-w-lg rounded-md border border-input bg-background px-2 py-1 text-sm font-semibold outline-none focus:ring-2 focus:ring-ring"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className="max-w-full truncate rounded-md px-1 py-0.5 text-left text-sm font-semibold hover:bg-accent/60"
              title="Clique para renomear"
            >
              {thread.title}
            </button>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Opções da conversa">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setEditingTitle(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Renomear
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExport} disabled={messages.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Exportar (.md)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleClear}
              disabled={messages.length === 0}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Limpar conversa
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setConfirmDelete(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Excluir sala
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="thin-scroll flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {messages.length === 0 ? (
            <EmptyState onPick={handleSend} />
          ) : (
            <div className="space-y-6">
              {messages.map((m) => (
                <MessageRow key={m.id} role={m.role} content={m.content} time={m.createdAt} />
              ))}
              {isTyping && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-border bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <Composer onSend={handleSend} disabled={isTyping} />
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Assistente mockado — as respostas são simuladas.
          </p>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta sala?</AlertDialogTitle>
            <AlertDialogDescription>
              A conversa "{thread.title}" será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteThread(threadId);
                setConfirmDelete(false);
                navigate({ to: "/" });
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (t: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Como posso ajudar hoje?</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Comece com uma das sugestões abaixo ou escreva sua própria pergunta.
      </p>
      <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.title}
            type="button"
            onClick={() => onPick(s.body)}
            className="group rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-sm"
          >
            <div className="text-sm font-medium">{s.title}</div>
            <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.body}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageRow({
  role,
  content,
  time,
}: {
  role: "user" | "assistant";
  content: string;
  time: number;
}) {
  const isUser = role === "user";
  return (
    <div className={cn("group flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-full",
          isUser ? "bg-user-bubble text-user-bubble-foreground" : "bg-accent text-accent-foreground",
        )}
      >
        {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn("flex min-w-0 max-w-[85%] flex-col", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5",
            isUser
              ? "bg-user-bubble text-user-bubble-foreground rounded-tr-sm"
              : "bg-muted text-foreground rounded-tl-sm",
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{content}</div>
          ) : (
            <Markdown>{content}</Markdown>
          )}
        </div>
        <div className="mt-1 px-1 text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
          {format(new Date(time), "HH:mm", { locale: ptBR })}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
      </div>
    </div>
  );
}
