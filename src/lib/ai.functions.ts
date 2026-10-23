import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseVoiceSettings } from "@/lib/voice-settings";
import { buildAtlasBody } from "@/lib/atlas-request";
import { NO_KEY_REPLY, openAiErrorMessage } from "@/lib/ai-policy";

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
    const body = buildAtlasBody({ cfgModel: cfg.model, vs: parseVoiceSettings(cfg.voice_settings), voice: !!data.voice, context: data.context, messages: data.messages });
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
