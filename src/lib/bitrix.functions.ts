import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canManageBitrix } from "@/lib/bitrix-policy";

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
    return { companies, isAdmin, name: profile.data?.display_name || "Usuário", status: "setup_required" as const };
  });