import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { RawDataset } from "@/lib/crm-data";
import { loadDataset } from "@/lib/dashboard-load";

/** Real Bitrix24 data for a company, read through RLS (colaboradores only get their own deals). Null = not connected. */
export const getDashboardData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<RawDataset | null> => loadDataset(context.supabase as unknown as SupabaseClient, data.companyId));
