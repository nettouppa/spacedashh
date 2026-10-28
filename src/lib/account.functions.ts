import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Membership = { companyId: string; companyName: string; role: "gestor" | "colaborador"; sellerRef: string | null };
export type Me = { userId: string; email: string | null; name: string; isAdmin: boolean; memberships: Membership[] };

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Me> => {
    const { supabase, userId } = context;
    const [{ data: prof }, { data: admin }, { data: mem }] = await Promise.all([
      supabase.from("profiles").select("email, display_name").eq("id", userId).maybeSingle(),
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.from("company_members").select("company_id, role, seller_ref, companies(name)").eq("user_id", userId),
    ]);
    return {
      userId,
      email: prof?.email ?? null,
      name: prof?.display_name || prof?.email || "Usuário",
      isAdmin: !!admin,
      memberships: (mem ?? []).map((m) => ({
        companyId: m.company_id, role: m.role, sellerRef: m.seller_ref,
        companyName: (m.companies as { name: string } | null)?.name ?? "Empresa",
      })),
    };
  });

const Order = z.array(z.string().max(40)).max(40);
const Sizes = z.record(z.string().max(40), z.number().int().min(1).max(12));
const LayoutSchema = z.object({ companyId: z.string().uuid(), layout: z.object({
  order: Order.optional(), sizes: Sizes.optional(),
  views: z.array(z.object({ id: z.string().min(1).max(40), name: z.string().trim().min(1).max(60), order: Order, sizes: Sizes })).max(30).optional(),
  active: z.string().max(40).optional(),
}) });

export const getLayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase.from("user_layouts").select("layout").eq("user_id", context.userId).eq("company_id", data.companyId).maybeSingle();
    return (row?.layout ?? null) as import("./views").StoredLayout | null;
  });

export const saveLayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => LayoutSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("user_layouts").upsert({ user_id: context.userId, company_id: data.companyId, layout: data.layout, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Admin ----------
async function assertAdmin(supabase: { rpc: (...a: never[]) => unknown }, userId: string) {
  const { data } = await (supabase.rpc as unknown as (n: string, a: object) => Promise<{ data: boolean | null }>)("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Acesso restrito ao administrador.");
}

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const [{ data: companies }, { data: members }, { data: profiles }] = await Promise.all([
      context.supabase.from("companies").select("id, name").order("created_at"),
      context.supabase.from("company_members").select("id, company_id, user_id, role, seller_ref"),
      context.supabase.from("profiles").select("id, email, display_name"),
    ]);
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: bxUsers } = await supabaseAdmin.from("bitrix_users" as never).select("company_id, user_id, name").order("name" as never).limit(5000) as unknown as { data: { company_id: string; user_id: string; name: string }[] | null };
    return (companies ?? []).map((c) => ({
      ...c,
      sellers: (bxUsers ?? []).filter((u) => u.company_id === c.id).map((u) => ({ id: u.user_id, name: u.name })),
      members: (members ?? []).filter((m) => m.company_id === c.id).map((m) => ({ ...m, email: byId.get(m.user_id)?.email ?? "—", name: byId.get(m.user_id)?.display_name ?? "" })),
    }));
  });

export const createCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ name: z.string().trim().min(2).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { error } = await context.supabase.from("companies").insert({ name: data.name });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const inviteMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    companyId: z.string().uuid(), email: z.string().trim().email().max(255),
    role: z.enum(["gestor", "colaborador"]), sellerRef: z.string().trim().max(40).optional(), redirectTo: z.string().url().max(500),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.toLowerCase();
    const { data: existing } = await supabaseAdmin.from("profiles").select("id").ilike("email", email).maybeSingle();
    let uid = existing?.id;
    let invited = false;
    if (!uid) {
      const { data: inv, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo: data.redirectTo });
      if (error || !inv.user) throw new Error(error?.message ?? "Não foi possível convidar.");
      uid = inv.user.id; invited = true;
    }
    const { error } = await supabaseAdmin.from("company_members").upsert(
      { company_id: data.companyId, user_id: uid, role: data.role, seller_ref: data.sellerRef || null },
      { onConflict: "company_id,user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true, invited };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { error } = await context.supabase.from("company_members").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), role: z.enum(["gestor", "colaborador"]), sellerRef: z.string().trim().max(40).nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { error } = await context.supabase.from("company_members").update({ role: data.role, seller_ref: data.sellerRef || null }).eq("id", data.id);
    if (error) throw new Error("Não foi possível salvar a alteração.");
    return { ok: true };
  });
