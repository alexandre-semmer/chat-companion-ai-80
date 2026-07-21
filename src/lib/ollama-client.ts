const DEFAULT_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL = "llama3.2";

export interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamOptions {
  model?: string;
  baseUrl?: string;
  messages: OllamaMessage[];
  onChunk: (chunk: string) => void;
  signal?: AbortSignal;
}

export async function streamOllamaChat(options: StreamOptions): Promise<void> {
  const { model = DEFAULT_MODEL, baseUrl = DEFAULT_BASE_URL, messages, onChunk, signal } = options;

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Ollama retornou ${res.status}: ${await res.text()}`);
  }

  if (!res.body) {
    throw new Error("Resposta do Ollama não possui body");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line) as {
            message?: { content?: string };
            done?: boolean;
            error?: string;
          };
          if (json.error) {
            throw new Error(json.error);
          }
          if (json.message?.content) {
            onChunk(json.message.content);
          }
          if (json.done) return;
        } catch (e) {
          if (e instanceof SyntaxError) {
            console.error("Falha ao interpretar chunk do Ollama:", line, e);
            continue;
          }
          throw e;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
