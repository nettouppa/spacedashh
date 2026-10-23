import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Monthly sales goals of a company (RLS: any member reads). */
export const getGoals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from("sales_goals")
      .select("month, seller_ref, amount").eq("company_id", data.companyId);
    if (error) throw new Error("Não foi possível carregar as metas.");
    return (rows ?? []).map((r) => ({ month: r.month, seller_ref: r.seller_ref, amount: Number(r.amount) }));
  });

/** Replaces one month's goals (RLS: only gestor/admin can write). */
export const saveGoals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    companyId: z.string().uuid(),
    month: z.string().regex(/^\d{4}-\d{2}$/),
    goals: z.array(z.object({ sellerRef: z.string().min(1).max(64), amount: z.number().min(0).max(1e12) })).max(500),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const month = `${data.month}-01`;
    const { error: delErr } = await sb.from("sales_goals").delete().eq("company_id", data.companyId).eq("month", month);
    if (delErr) throw new Error("Sem permissão para editar metas.");
    const rows = data.goals.map((g) => ({ company_id: data.companyId, month, seller_ref: g.sellerRef, amount: g.amount }));
    if (rows.length) {
      const { error } = await sb.from("sales_goals").insert(rows);
      if (error) throw new Error("Sem permissão para editar metas.");
    }
    return { ok: true, count: rows.length };
  });
