import { useEffect, useRef, useState } from "react";
import { Paperclip, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  onSend: (text: string) => void | Promise<void>;
  disabled?: boolean;
}

const MAX_HEIGHT = 220;

export function Composer({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, MAX_HEIGHT) + "px";
  }, [value]);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled]);

  const canSend = value.trim().length > 0 && !disabled;

  const submit = () => {
    if (!canSend) return;
    const text = value.trim();
    setValue("");
    void onSend(text);
  };

  return (
    <div
      className={cn(
        "relative flex items-end gap-2 rounded-2xl border border-input bg-card px-3 py-2 shadow-sm transition focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-ring/30",
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="mb-0.5 h-8 w-8 shrink-0 text-muted-foreground"
        aria-label="Anexar arquivo"
        disabled
        title="Anexos em breve"
      >
        <Paperclip className="h-4 w-4" />
      </Button>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Envie uma mensagem..."
        rows={1}
        className="thin-scroll min-h-[36px] flex-1 resize-none bg-transparent py-1.5 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground"
        style={{ maxHeight: MAX_HEIGHT }}
      />
      <Button
        type="button"
        size="icon"
        onClick={submit}
        disabled={!canSend}
        className={cn(
          "mb-0.5 h-8 w-8 shrink-0 rounded-lg bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-40",
        )}
        aria-label="Enviar mensagem"
      >
        <ArrowUp className="h-4 w-4" />
      </Button>
    </div>
  );
}
