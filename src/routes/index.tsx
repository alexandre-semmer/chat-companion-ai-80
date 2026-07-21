import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { ensureBootstrapThread, useChatState } from "@/lib/chat-store";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const threads = useChatState((s) => s.threads);
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    const t = ensureBootstrapThread();
    void navigate({ to: "/c/$threadId", params: { threadId: t.id }, replace: true });
  }, [navigate]);

  // Fallback: if threads become available before effect commits (SSR->hydration)
  useEffect(() => {
    if (threads[0] && !bootstrappedRef.current) {
      bootstrappedRef.current = true;
      void navigate({ to: "/c/$threadId", params: { threadId: threads[0].id }, replace: true });
    }
  }, [threads, navigate]);

  return (
    <div className="grid h-full place-items-center text-sm text-muted-foreground">
      Carregando...
    </div>
  );
}
