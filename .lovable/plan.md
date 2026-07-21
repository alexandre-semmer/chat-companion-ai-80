Para trocar o assistente mockado por respostas reais do Ollama local, a estratégia é fazer a chamada diretamente do browser para `http://localhost:11434` e renderizar os pedaços da resposta conforme chegam. Ollama roda na máquina do usuário, então o servidor da Lovable (Cloudflare Worker) não consegue acessar `localhost:11434` — a chamada precisa partir do cliente.

### Arquivos a alterar

| Ação | Arquivo | Motivo |
| --- | --- | --- |
| Criar | `src/lib/ollama-client.ts` | Cliente que faz `POST /api/chat` para o Ollama, lê o stream NDJSON e chama `onChunk` para cada pedaço. |
| Alterar | `src/lib/chat-store.ts` | Adicionar função `updateMessageContent(threadId, messageId, content)` para atualizar o texto da mensagem do assistente em tempo real enquanto o stream chega. |
| Alterar | `src/components/chat/ChatWindow.tsx` | Substituir `mockAssistantReply` por uma chamada ao cliente do Ollama, criar mensagem vazia do assistente e ir preenchendo com os chunks. |
| Deletar/ignorar | `src/lib/mock-assistant.ts` | Não será mais usado; pode ser removido. |

### Detalhes técnicos

- **Endpoint Ollama**: `POST http://localhost:11434/api/chat`
- **Body**: `{ model: "llama3.2", messages: [{ role: "user", content: "..." }], stream: true }` (ajuste o modelo conforme o que estiver rodando no `ollama list`).
- **Resposta**: stream de linhas JSON (`NDJSON`). Cada linha tem o campo `message.content` com o próximo pedaço de texto. A linha final tem `done: true`.
- **CORS**: Ollama precisa permitir a origem do app. Para testes locais, inicie com a variável de ambiente `OLLAMA_ORIGINS=*` (ex.: `OLLAMA_ORIGINS=* ollama serve`).
- **Limitação**: como o Ollama é local, só funciona se o browser da pessoa estiver na mesma máquina/rede que o Ollama (dev local). Em produção/publicado, o browser não acessa o `localhost` da máquina do usuário — nesse caso seria necessário expor o Ollama via algum tipo de túnel ou rodá-lo em um servidor acessível.

### Alternativa server-side (opcional)

Se no futuro quiser esconder o endpoint Ollama ou adicionar lógica no servidor (ex.: filtrar resposta, guardar histórico), pode criar uma server route em `src/routes/api/chat.ts` que faz proxy para o Ollama. Isso só funciona se o Ollama estiver acessível pelo servidor (não no cenário "localhost da máquina do usuário"). Para o seu caso atual, a chamada direta do browser é o caminho correto.

### Passos sugeridos

1. Adicionar `updateMessageContent` em `chat-store.ts` para permitir streaming.
2. Criar `src/lib/ollama-client.ts` com a função de stream.
3. Refatorar `handleSend` em `ChatWindow.tsx` para usar o novo cliente.
4. Ajustar `TypingIndicator` para também aparecer enquanto o stream está ativo.
5. Testar localmente com Ollama rodando (`ollama serve` com `OLLAMA_ORIGINS=*`).

Quer que eu implemente essas mudanças agora?