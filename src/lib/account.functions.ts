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
