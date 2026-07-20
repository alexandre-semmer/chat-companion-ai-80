import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  MessageSquare,
  X,
  Sun,
  Moon,
  Settings,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import {
  createThread,
  deleteThread,
  renameThread,
  useChatState,
  type Thread,
} from "@/lib/chat-store";
import { useTheme } from "@/lib/use-theme";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";

function groupByDate(threads: Thread[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;

  const groups: { label: string; items: Thread[] }[] = [
    { label: "Hoje", items: [] },
    { label: "Ontem", items: [] },
    { label: "Últimos 7 dias", items: [] },
    { label: "Mais antigas", items: [] },
  ];

  for (const t of threads) {
    if (t.updatedAt >= startOfToday) groups[0].items.push(t);
    else if (t.updatedAt >= startOfYesterday) groups[1].items.push(t);
    else if (t.updatedAt >= startOfWeek) groups[2].items.push(t);
    else groups[3].items.push(t);
  }
  return groups.filter((g) => g.items.length > 0);
}

interface Props {
  onNavigate?: () => void;
}

export function ChatSidebar({ onNavigate }: Props) {
  const threads = useChatState((s) => s.threads);
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { threadId?: string };
  const activeId = params.threadId;
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Thread | null>(null);
  const { theme, toggle } = useTheme();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.lastMessagePreview ?? "").toLowerCase().includes(q),
    );
  }, [threads, query]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  const handleNew = () => {
    const t = createThread();
    onNavigate?.();
    navigate({ to: "/c/$threadId", params: { threadId: t.id } });
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <Link
          to="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
          onClick={onNavigate}
        >
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <span>Lumen</span>
        </Link>
        {onNavigate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden"
            onClick={onNavigate}
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* New chat */}
      <div className="px-3">
        <Button
          onClick={handleNew}
          className="w-full justify-start gap-2 rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nova sala
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 pt-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar conversas"
            className="h-9 rounded-xl border-sidebar-border bg-background/40 pl-8"
          />
        </div>
      </div>

      {/* List */}
      <div className="thin-scroll mt-2 flex-1 overflow-y-auto px-2 pb-2">
        {threads.length === 0 ? (
          <div className="mt-8 px-3 text-center text-sm text-muted-foreground">
            <MessageSquare className="mx-auto mb-2 h-6 w-6 opacity-50" />
            Nenhuma conversa ainda.
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-8 px-3 text-center text-sm text-muted-foreground">
            Nada encontrado.
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g.label}>
                <div className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {g.label}
                </div>
                <ul className="space-y-0.5">
                  {g.items.map((t) => (
                    <ThreadRow
                      key={t.id}
                      thread={t}
                      active={t.id === activeId}
                      editing={editingId === t.id}
                      onStartEdit={() => setEditingId(t.id)}
                      onFinishEdit={() => setEditingId(null)}
                      onSelect={() => {
                        onNavigate?.();
                        navigate({ to: "/c/$threadId", params: { threadId: t.id } });
                      }}
                      onDelete={() => setPendingDelete(t)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center gap-2 border-t border-sidebar-border px-3 py-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground text-xs font-semibold">
          VC
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">Você</div>
          <div className="truncate text-[11px] text-muted-foreground">Plano Free</div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggle}
          aria-label="Alternar tema"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Configurações">
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá permanentemente "{pendingDelete?.title}" e todo o seu histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!pendingDelete) return;
                const wasActive = pendingDelete.id === activeId;
                deleteThread(pendingDelete.id);
                setPendingDelete(null);
                if (wasActive) navigate({ to: "/" });
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

interface RowProps {
  thread: Thread;
  active: boolean;
  editing: boolean;
  onStartEdit: () => void;
  onFinishEdit: () => void;
  onSelect: () => void;
  onDelete: () => void;
}

function ThreadRow({
  thread,
  active,
  editing,
  onStartEdit,
  onFinishEdit,
  onSelect,
  onDelete,
}: RowProps) {
  const [draft, setDraft] = useState(thread.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== thread.title) renameThread(thread.id, next);
    onFinishEdit();
  };

  return (
    <li>
      <div
        className={cn(
          "group relative flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "hover:bg-sidebar-accent/60",
        )}
      >
        <button
          type="button"
          onClick={onSelect}
          onDoubleClick={onStartEdit}
          className="min-w-0 flex-1 text-left"
        >
          {editing ? (
            <input
              ref={inputRef}
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") {
                  setDraft(thread.title);
                  onFinishEdit();
                }
              }}
              className="w-full rounded border border-input bg-background px-1.5 py-0.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          ) : (
            <>
              <div className="truncate font-medium">{thread.title}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="truncate">
                  {thread.lastMessagePreview || "Sem mensagens ainda"}
                </span>
                <span aria-hidden>·</span>
                <span className="shrink-0">
                  {formatDistanceToNowStrict(new Date(thread.updatedAt), {
                    locale: ptBR,
                    addSuffix: false,
                  })}
                </span>
              </div>
            </>
          )}
        </button>

        {!editing && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100",
                  active && "opacity-100",
                )}
                onClick={(e) => e.stopPropagation()}
                aria-label="Ações da conversa"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onStartEdit}>
                <Pencil className="mr-2 h-4 w-4" /> Renomear
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </li>
  );
}
