import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canManageBitrix, parseWebhookUrl, canBindPortal } from "@/lib/bitrix-policy";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

async function assertManager(supabase: SupabaseClient<Database>, userId: string, companyId: string) {
  const [admin, role] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.rpc("member_role_of", { _user_id: userId, _company_id: companyId }),
  ]);
  if (!canManageBitrix(admin.data === true, (role.data as "gestor" | "colaborador" | null) ?? null)) throw new Error("Seu perfil não permite gerenciar esta integração.");
}

export const getBitrixSetup = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [admin, memberships, profile] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.from("company_members").select("company_id, role, companies(name)").eq("user_id", userId),
      supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    ]);
    if (admin.error || memberships.error || profile.error) throw new Error("Não foi possível verificar seu acesso. Tente novamente.");
    const isAdmin = admin.data === true;
    let companies = (memberships.data ?? []).map((m) => ({
      id: m.company_id,
      name: (m.companies as { name: string } | null)?.name ?? "Empresa",
      canManage: canManageBitrix(isAdmin, m.role),
    }));
    if (isAdmin) {
      const result = await supabase.from("companies").select("id, name").order("name");
      if (result.error) throw new Error("Não foi possível carregar as empresas.");
      companies = (result.data ?? []).map((c) => ({ ...c, canManage: true }));
    }
    const withStatus = await Promise.all(companies.map(async (c) => {
      const { data } = await supabase.rpc("bitrix_status", { _company_id: c.id });
      const s = Array.isArray(data) ? data[0] : null;
      return { ...c, connection: s ?? null };
    }));
    return { companies: withStatus, isAdmin, name: profile.data?.display_name || "Usuário" };
  });

export const connectBitrixWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid(), url: z.string().min(10).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context.supabase, context.userId, data.companyId);
    const hook = parseWebhookUrl(data.url);
    if (!hook) throw new Error("URL do webhook inválida. Ex.: https://suaempresa.bitrix24.com.br/rest/1/abc123/");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const taken = await supabaseAdmin.from("bitrix_connections").select("company_id").eq("member_id", hook.domain).maybeSingle();
    if (!canBindPortal(taken.data?.company_id ?? null, data.companyId)) throw new Error("Este portal já está vinculado a outra empresa no Spacedash.");
    const { testWebhook } = await import("@/lib/bitrix.server");
    const who = await testWebhook(hook.url);
    const up = await supabaseAdmin.from("bitrix_connections").upsert({
      company_id: data.companyId, domain: hook.domain, member_id: hook.domain, webhook_url: hook.url,
      client_endpoint: null, access_token: null, refresh_token: null, expires_at: null,
      connected_by: context.userId, connected_at: new Date().toISOString(), last_sync_status: null, last_sync_error: null,
    }, { onConflict: "company_id" });
    if (up.error) throw new Error("Não foi possível salvar a conexão.");
    return { domain: hook.domain, userName: who.userName, isAdmin: who.isAdmin };
  });

export const syncBitrixNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context.supabase, context.userId, data.companyId);
    const { syncDeals } = await import("@/lib/bitrix.server");
    return syncDeals(data.companyId);
  });

export const disconnectBitrix = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context.supabase, context.userId, data.companyId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("bitrix_connections").delete().eq("company_id", data.companyId);
    return { ok: true };
  });
