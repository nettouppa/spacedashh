import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canManageBitrix, normalizePortalDomain, BITRIX_SETUP_URLS } from "@/lib/bitrix-policy";
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

export const startBitrixConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid(), domain: z.string().min(3).max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertManager(context.supabase, context.userId, data.companyId);
    const domain = normalizePortalDomain(data.domain);
    if (!domain) throw new Error("Endereço do portal inválido. Ex.: suaempresa.bitrix24.com.br");
    const { clientId } = await import("@/lib/bitrix.server");
    const nonce = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ins = await supabaseAdmin.from("bitrix_oauth_states").insert({ nonce, company_id: data.companyId, user_id: context.userId, domain });
    if (ins.error) throw new Error("Não foi possível iniciar a conexão.");
    const qs = new URLSearchParams({ client_id: clientId(), state: nonce, redirect_uri: BITRIX_SETUP_URLS.callback });
    return { url: `https://${domain}/oauth/authorize/?${qs}` };
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
