import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { RawDataset } from "@/lib/crm-data";

/** Real Bitrix24 data for a company, read through RLS (colaboradores only get their own deals). Null = not connected. */
export const getDashboardData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<RawDataset | null> => {
    const sb = context.supabase;
    const { data: st } = await sb.rpc("bitrix_status", { _company_id: data.companyId });
    const status = Array.isArray(st) ? (st[0] as { domain?: string; last_sync_at?: string | null } | undefined) : undefined;
    if (!status?.domain) return null;
    const deals: RawDataset["deals"] = [];
    for (let from = 0; from < 20000; from += 1000) {
      const { data: rows, error } = await sb.from("bitrix_deals")
        .select("deal_id, title, stage_id, category_id, opportunity, assigned_by_id, closed, date_create, close_date, date_modify")
        .eq("company_id", data.companyId).order("deal_id").range(from, from + 999);
      if (error) throw new Error("Não foi possível carregar os negócios.");
      deals.push(...(rows as RawDataset["deals"]));
      if (!rows || rows.length < 1000) break;
    }
    const [users, stages] = await Promise.all([
      sb.from("bitrix_users" as never).select("user_id, name, photo, department").eq("company_id", data.companyId),
      sb.from("bitrix_stages" as never).select("stage_id, category_id, category_name, name, sort, semantics").eq("company_id", data.companyId),
    ]);
    return {
      domain: status.domain, lastSyncAt: status.last_sync_at ?? null, deals,
      users: (users.data ?? []) as RawDataset["users"], stages: (stages.data ?? []) as RawDataset["stages"],
    };
  });
