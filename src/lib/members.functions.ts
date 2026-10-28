import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canManageMembers, isPending, type MemberRole } from "./members-policy";

type Sb = { rpc: (n: string, a: object) => Promise<{ data: unknown }> };

async function assertCanManage(supabase: unknown, userId: string, companyId: string) {
  const sb = supabase as Sb;
  const [{ data: admin }, { data: role }] = await Promise.all([
    sb.rpc("has_role", { _user_id: userId, _role: "admin" }),
    sb.rpc("member_role_of", { _user_id: userId, _company_id: companyId }),
  ]);
  if (!canManageMembers(!!admin, role as MemberRole | null)) throw new Error("Apenas gestores podem gerenciar membros desta empresa.");
  return !!admin;
}

async function assertAdmin(supabase: unknown, userId: string) {
  const { data } = await (supabase as Sb).rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Acesso restrito ao administrador da plataforma.");
}

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function companyOfMember(id: string) {
  const sa = await admin();
  const { data } = await sa.from("company_members").select("company_id, user_id").eq("id", id).maybeSingle();
  if (!data) throw new Error("Membro não encontrado.");
  return data;
}

export type MemberRow = { id: string; userId: string; email: string; name: string; role: MemberRole; sellerRef: string | null; pending: boolean; lastSignInAt: string | null; createdAt: string };

export const listMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanManage(context.supabase, context.userId, data.companyId);
    const sa = await admin();
    const [{ data: mem }, { data: sellers }] = await Promise.all([
      sa.from("company_members").select("id, user_id, role, seller_ref, created_at").eq("company_id", data.companyId).order("created_at"),
      sa.from("bitrix_users").select("user_id, name").eq("company_id", data.companyId).order("name").limit(5000),
    ]);
    const ids = (mem ?? []).map((m) => m.user_id);
    const { data: profs } = ids.length ? await sa.from("profiles").select("id, email, display_name").in("id", ids) : { data: [] };
    const byId = new Map((profs ?? []).map((p) => [p.id, p]));
    const users = await Promise.all(ids.map((id) => sa.auth.admin.getUserById(id).then((r) => [id, r.data.user?.last_sign_in_at ?? null] as const).catch(() => [id, null] as const)));
    const signIn = new Map(users);
    const rows: MemberRow[] = (mem ?? []).map((m) => {
      const last = signIn.get(m.user_id) ?? null;
      return { id: m.id, userId: m.user_id, email: byId.get(m.user_id)?.email ?? "—", name: byId.get(m.user_id)?.display_name ?? "", role: m.role, sellerRef: m.seller_ref, pending: isPending(last), lastSignInAt: last, createdAt: m.created_at };
    });
    return { members: rows, sellers: (sellers ?? []).map((s) => ({ id: s.user_id, name: s.name })), me: context.userId };
  });

export const inviteToCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    companyId: z.string().uuid(), email: z.string().trim().email().max(255),
    role: z.enum(["gestor", "colaborador"]), sellerRef: z.string().trim().max(40).optional(), redirectTo: z.string().url().max(500),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanManage(context.supabase, context.userId, data.companyId);
    return invite(data);
  });

async function invite(data: { companyId: string; email: string; role: MemberRole; sellerRef?: string | undefined; redirectTo: string }) {
  const sa = await admin();
  const email = data.email.toLowerCase();
  const { data: existing } = await sa.from("profiles").select("id").ilike("email", email).maybeSingle();
  let uid = existing?.id;
  let invited = false;
  if (!uid) {
    const { data: inv, error } = await sa.auth.admin.inviteUserByEmail(email, { redirectTo: data.redirectTo });
    if (error || !inv.user) throw new Error(error?.message ?? "Não foi possível convidar.");
    uid = inv.user.id; invited = true;
  }
  const { error } = await sa.from("company_members").upsert(
    { company_id: data.companyId, user_id: uid, role: data.role, seller_ref: data.sellerRef || null },
    { onConflict: "company_id,user_id" },
  );
  if (error) throw new Error("Não foi possível salvar o acesso.");
  return { ok: true, invited };
}

export const resendInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), redirectTo: z.string().url().max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const m = await companyOfMember(data.id);
    await assertCanManage(context.supabase, context.userId, m.company_id);
    const sa = await admin();
    const { data: prof } = await sa.from("profiles").select("email").eq("id", m.user_id).maybeSingle();
    if (!prof?.email) throw new Error("E-mail não encontrado.");
    const { error } = await sa.auth.resetPasswordForEmail(prof.email, { redirectTo: data.redirectTo });
    if (error) throw new Error("Não foi possível reenviar agora. Tente em alguns minutos.");
    return { ok: true, email: prof.email };
  });

export const updateCompanyMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), role: z.enum(["gestor", "colaborador"]), sellerRef: z.string().trim().max(40).nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const m = await companyOfMember(data.id);
    const isAdmin = await assertCanManage(context.supabase, context.userId, m.company_id);
    if (m.user_id === context.userId && data.role !== "gestor" && !isAdmin) throw new Error("Você não pode retirar o seu próprio perfil de gestor.");
    const sa = await admin();
    const { error } = await sa.from("company_members").update({ role: data.role, seller_ref: data.sellerRef || null }).eq("id", data.id);
    if (error) throw new Error("Não foi possível salvar a alteração.");
    return { ok: true };
  });

export const removeCompanyMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const m = await companyOfMember(data.id);
    await assertCanManage(context.supabase, context.userId, m.company_id);
    if (m.user_id === context.userId) throw new Error("Você não pode remover o seu próprio acesso.");
    const sa = await admin();
    const { error } = await sa.from("company_members").delete().eq("id", data.id);
    if (error) throw new Error("Não foi possível remover.");
    return { ok: true };
  });

// ---------- Plataforma (admin) ----------
export const listCompanies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sa = await admin();
    const [{ data: companies }, { data: members }, { data: conns }] = await Promise.all([
      sa.from("companies").select("id, name, created_at").order("name"),
      sa.from("company_members").select("company_id, role"),
      sa.from("bitrix_connections").select("company_id, domain, last_sync_at, last_sync_status, deals_count"),
    ]);
    const cm = new Map((conns ?? []).map((c) => [c.company_id, c]));
    return (companies ?? []).map((c) => {
      const ms = (members ?? []).filter((m) => m.company_id === c.id);
      const b = cm.get(c.id);
      return { id: c.id, name: c.name, createdAt: c.created_at, members: ms.length, managers: ms.filter((m) => m.role === "gestor").length,
        bitrix: b ? { domain: b.domain, lastSyncAt: b.last_sync_at, status: b.last_sync_status, deals: b.deals_count } : null };
    });
  });

export const createCompanyWithManager = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ name: z.string().trim().min(2).max(100), managerEmail: z.string().trim().email().max(255).optional(), redirectTo: z.string().url().max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sa = await admin();
    const { data: c, error } = await sa.from("companies").insert({ name: data.name }).select("id").single();
    if (error || !c) throw new Error("Não foi possível criar a empresa.");
    let invited: boolean | null = null;
    if (data.managerEmail) invited = (await invite({ companyId: c.id, email: data.managerEmail, role: "gestor", redirectTo: data.redirectTo })).invited;
    return { id: c.id, invited };
  });

export const renameCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), name: z.string().trim().min(2).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("companies").update({ name: data.name }).eq("id", data.id);
    if (error) throw new Error("Não foi possível renomear.");
    return { ok: true };
  });
