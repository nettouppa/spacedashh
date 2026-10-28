import type { SupabaseClient } from "@supabase/supabase-js";
import type { RawDataset } from "@/lib/crm-data";

/** Loads a company's synced Bitrix24 dataset with the given client (RLS user client or verified admin client). Null = not connected. */
export async function loadDataset(sb: SupabaseClient, companyId: string): Promise<RawDataset | null> {
  const { data: st } = await sb.rpc("bitrix_status", { _company_id: companyId });
  const status = Array.isArray(st) ? (st[0] as { domain?: string; last_sync_at?: string | null; last_sync_status?: string | null } | undefined) : undefined;
  if (!status?.domain) return null;
  const deals: RawDataset["deals"] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data: rows, error } = await sb.from("bitrix_deals")
      .select("deal_id, title, stage_id, category_id, opportunity, assigned_by_id, closed, date_create, close_date, date_modify, source_name, moved_time, company_ref, contact_ref")
      .eq("company_id", companyId).order("deal_id").range(from, from + 999);
    if (error) throw new Error("Não foi possível carregar os negócios.");
    deals.push(...(rows as RawDataset["deals"]));
    if (!rows || rows.length < 1000) break;
  }
  const [users, stages] = await Promise.all([
    sb.from("bitrix_users").select("user_id, name, photo, department").eq("company_id", companyId),
    sb.from("bitrix_stages").select("stage_id, category_id, category_name, name, sort, semantics").eq("company_id", companyId),
  ]);
  const page = async <T,>(table: string, cols: string, key: string): Promise<T[]> => {
    const out: T[] = [];
    for (let from = 0; from < 15000; from += 1000) {
      const { data: rows, error } = await sb.from(table).select(cols).eq("company_id", companyId).order(key).range(from, from + 999);
      if (error || !rows) break;
      out.push(...(rows as unknown as T[]));
      if (rows.length < 1000) break;
    }
    return out;
  };
  const [activities, tasks] = await Promise.all([
    page<NonNullable<RawDataset["activities"]>[number]>("bitrix_activities", "type, responsible_id, owner_type_id, owner_id, completed, created_at, deadline, provider, channel, start_time, end_time", "activity_id"),
    page<NonNullable<RawDataset["tasks"]>[number]>("bitrix_tasks", "responsible_id, status, created_at, deadline, closed_at", "task_id"),
  ]);
  return {
    activities, tasks,
    domain: status.domain, lastSyncAt: status.last_sync_at ?? null, syncStatus: status.last_sync_status ?? null, deals,
    users: (users.data ?? []) as RawDataset["users"], stages: (stages.data ?? []) as RawDataset["stages"],
  };
}
