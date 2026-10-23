import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseVoiceSettings, voiceStyle } from "@/lib/voice-settings";
import { NO_KEY_REPLY, openAiErrorMessage, DEFAULT_OPENAI_MODEL, reasoningEffort } from "@/lib/ai-policy";

const Input = z.object({
  companyId: z.string().uuid(),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(30),
  context: z.string().max(12000),
  voice: z.boolean().optional(),
});

export type AiAction = {
  period?: "week" | "month" | "quarter" | "semester" | "year" | undefined; from?: string | undefined; to?: string | undefined; company?: string | null | undefined; team?: string | null | undefined;
  sellerId?: string | null | undefined; stage?: string | null | undefined; lossReason?: string | null | undefined; clear?: boolean | undefined; tvMode?: boolean | undefined;
};

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const [member, admin] = await Promise.all([
      context.supabase.rpc("is_member", { _user_id: context.userId, _company_id: data.companyId }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    ]);
    if (member.data !== true && admin.data !== true) return { reply: "Você não tem acesso a esta empresa.", action: null as AiAction | null, noKey: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cfg } = await supabaseAdmin.from("ai_settings").select("api_key, model, voice_settings").eq("company_id", data.companyId).maybeSingle();
    if (!cfg?.api_key) return { reply: NO_KEY_REPLY, action: null as AiAction | null, noKey: true };
    const key = cfg.api_key;
    const vs = parseVoiceSettings(cfg.voice_settings);
    const model = (data.voice && vs.voiceModel) || cfg.model || DEFAULT_OPENAI_MODEL;
    const style = data.voice ? voiceStyle(vs.length) : "Responda de forma objetiva, usando markdown curto.";
    const system = `Você é Atlas, o copiloto de vendas do painel Spacedash (dados do CRM Bitrix24). Responda em português. ${style} Use APENAS os dados do contexto abaixo. Quando o usuário pedir para filtrar, mostrar, focar, limpar ou abrir modo TV, chame a ferramenta apply_dashboard_action e inclua em reply uma confirmação curta. Para remover um filtro específico envie null.\n\nCONTEXTO:\n${data.context}`;
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        ...(reasoningEffort(model, !!data.voice) ? { reasoning_effort: reasoningEffort(model, !!data.voice) } : {}),
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
    if (!res.ok) {
      let code: string | null = null;
      try { code = (await res.json())?.error?.code ?? null; } catch { /* ignore */ }
      console.error("openai error", res.status, code);
      return { reply: openAiErrorMessage(res.status, code), action: null, noKey: false };
    }
    const json = await res.json();
    const msg = json.choices?.[0]?.message;
    const call = msg?.tool_calls?.[0];
    let action: (AiAction & { reply?: string | undefined }) | null = null;
    if (call) { try { action = JSON.parse(call.function.arguments); } catch { action = null; } }
    return { reply: msg?.content || action?.reply || "Filtros aplicados.", action: action as AiAction | null, noKey: false };
  });
