import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(30),
  context: z.string().max(12000),
  voice: z.boolean().optional(),
});

export type AiAction = {
  period?: "week" | "month" | "quarter" | "semester" | "year" | undefined; from?: string | undefined; to?: string | undefined; company?: string | null | undefined; team?: string | null | undefined;
  sellerId?: string | null | undefined; stage?: string | null | undefined; lossReason?: string | null | undefined; clear?: boolean | undefined; tvMode?: boolean | undefined;
};

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) return { reply: "Assistente indisponível no momento.", action: null as AiAction | null };
    const style = data.voice
      ? "Você está numa conversa por VOZ: responda em 1 a 3 frases curtas e naturais, sem markdown, sem listas, sem tabelas, sem emojis. Escreva valores por extenso de forma falável (ex: 230 mil reais)."
      : "Responda de forma objetiva, usando markdown curto.";
    const system = `Você é Atlas, o copiloto de vendas do painel Spacedash (dados do CRM Bitrix24). Responda em português. ${style} Use APENAS os dados do contexto abaixo. Quando o usuário pedir para filtrar, mostrar, focar, limpar ou abrir modo TV, chame a ferramenta apply_dashboard_action e inclua em reply uma confirmação curta. Para remover um filtro específico envie null.\n\nCONTEXTO:\n${data.context}`;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, ...data.messages],
        tools: [{
          type: "function",
          function: {
            name: "apply_dashboard_action",
            description: "Aplica filtros/ações no dashboard",
            parameters: {
              type: "object",
              properties: {
                period: { type: "string", enum: ["week", "month", "quarter", "semester", "year"], description: "Período atual (esta semana, este mês...)" },
                from: { type: "string", description: "Início de um intervalo personalizado, AAAA-MM-DD (use junto com to)" },
                to: { type: "string", description: "Fim do intervalo personalizado, AAAA-MM-DD" },
                company: { type: ["string", "null"] }, team: { type: ["string", "null"] },
                sellerId: { type: ["string", "null"], description: "id do vendedor, ex s1" },
                stage: { type: ["string", "null"] }, lossReason: { type: ["string", "null"] },
                clear: { type: "boolean", description: "limpa todos os filtros" },
                tvMode: { type: "boolean" },
                reply: { type: "string", description: "mensagem curta ao usuário" },
              },
            },
          },
        }],
      }),
    });
    if (res.status === 429) return { reply: "Muitas solicitações, tente em instantes.", action: null };
    if (res.status === 402) return { reply: "Créditos de IA esgotados no workspace.", action: null };
    if (!res.ok) return { reply: `Erro do assistente (${res.status}).`, action: null };
    const json = await res.json();
    const msg = json.choices?.[0]?.message;
    const call = msg?.tool_calls?.[0];
    let action: (AiAction & { reply?: string | undefined }) | null = null;
    if (call) { try { action = JSON.parse(call.function.arguments); } catch { action = null; } }
    return { reply: msg?.content || action?.reply || "Filtros aplicados.", action: action as AiAction | null };
  });
