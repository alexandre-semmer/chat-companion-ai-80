// Simulated assistant: returns a friendly markdown-flavored echo after a small delay.
export async function mockAssistantReply(userText: string): Promise<string> {
  const delay = 700 + Math.min(1800, userText.length * 12);
  await new Promise((r) => setTimeout(r, delay));

  const trimmed = userText.trim();
  const looksLikeCode = /```|function |const |=>|import /.test(trimmed);
  const looksLikeQuestion = /\?$/.test(trimmed);

  if (looksLikeCode) {
    return [
      "Recebi um trecho de código. Aqui está uma versão comentada:",
      "",
      "```ts",
      trimmed.replace(/^```(\w+)?\n?|\n?```$/g, ""),
      "```",
      "",
      "**Observação:** este é um assistente mockado — o backend de IA ainda não está conectado.",
    ].join("\n");
  }

  if (looksLikeQuestion) {
    return [
      "Boa pergunta. Enquanto o modelo real não está plugado, aqui vai um esboço de resposta:",
      "",
      "- Ponto 1 sobre o assunto",
      "- Ponto 2 com um pouco mais de contexto",
      "- Ponto 3 para fechar a ideia",
      "",
      `> Você perguntou: *${trimmed}*`,
    ].join("\n");
  }

  return [
    `Anotado: **${trimmed || "(mensagem vazia)"}**`,
    "",
    "Este é um retorno simulado para validar o fluxo da interface. Quando você conectar um provedor de IA, as respostas reais aparecerão aqui com suporte a *markdown*, listas e `código`.",
  ].join("\n");
}
