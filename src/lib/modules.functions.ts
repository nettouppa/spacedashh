import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Synced record counts per Bitrix24 module for a company (RLS-scoped). */
export const getModuleCounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const count = async (table: "bitrix_deals" | "bitrix_activities" | "bitrix_tasks" | "bitrix_users", extra?: (q: any) => any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      let q = sb.from(table).select("company_id", { count: "exact", head: true }).eq("company_id", data.companyId);
      if (extra) q = extra(q);
      const { count: c } = await q;
      return c ?? 0;
    };
    const [deals, activities, tasks, support, users] = await Promise.all([
      count("bitrix_deals"), count("bitrix_activities"), count("bitrix_tasks"),
      count("bitrix_activities", (q) => q.not("channel", "is", null)), count("bitrix_users"),
    ]);
    return { deals, activities, tasks, support, users };
  });
