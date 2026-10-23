import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canManageAi, OPENAI_MODELS } from "@/lib/ai-policy";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

async function assertManager(supabase: SupabaseClient<Database>, userId: string, companyId: string) {
  const [admin, role] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("member_role_of", { _user_id: userId, _company_id: companyId }),
  ]);
  if (!canManageAi(admin.data === true, (role.data as "gestor" | "colaborador" | null) ?? null)) throw new Error("Seu perfil não permite configurar a IA desta empresa.");
}

export const getAiStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase.rpc("ai_status", { _company_id: data.companyId });
    const s = Array.isArray(rows) ? rows[0] : null;
    return s ? { connected: true, last4: s.last4 as string, model: s.model as string } : { connected: false, last4: null, model: null };
  });

export const saveAiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid(), apiKey: z.string().trim().min(20).max(300).optional(), model: z.enum(OPENAI_MODELS) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context.supabase, context.userId, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (!data.apiKey) {
      const { data: existing } = await supabaseAdmin.from("ai_settings").select("company_id").eq("company_id", data.companyId).maybeSingle();
      if (!existing) return { ok: false as const, error: "Informe a chave da OpenAI." };
      await supabaseAdmin.from("ai_settings").update({ model: data.model, updated_by: context.userId, updated_at: new Date().toISOString() }).eq("company_id", data.companyId);
      return { ok: true as const };
    }
    const test = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${data.apiKey}` } });
    if (test.status === 401) return { ok: false as const, error: "A OpenAI recusou esta chave. Confira e tente de novo." };
    if (!test.ok) return { ok: false as const, error: `Não foi possível validar a chave agora (erro ${test.status}).` };
    const { error } = await supabaseAdmin.from("ai_settings").upsert({
      company_id: data.companyId, provider: "openai", api_key: data.apiKey, key_last4: data.apiKey.slice(-4),
      model: data.model, updated_by: context.userId, updated_at: new Date().toISOString(),
    });
    if (error) return { ok: false as const, error: "Não foi possível salvar a chave." };
    return { ok: true as const };
  });

export const removeAiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context.supabase, context.userId, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("ai_settings").delete().eq("company_id", data.companyId);
    return { ok: true };
  });
