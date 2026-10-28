// Server-only Bitrix24 REST helpers (inbound webhook). Never import from client code.
import { channelOf } from "@/lib/crm-data";

/** webhook_url ends with "/", e.g. https://portal/rest/1/key/ — it is a secret; never log or return it. */
type Conn = { company_id: string; webhook_url: string };

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

const ERRORS: Record<string, string> = {
  INVALID_CREDENTIALS: "O webhook foi recusado pelo Bitrix24. Gere um novo e conecte novamente.",
  insufficient_scope: "O webhook não tem as permissões necessárias (CRM, Usuários, Departamentos, Tarefas, Canais Abertos).",
  NO_AUTH_FOUND: "O webhook foi recusado pelo Bitrix24. Gere um novo e conecte novamente.",
  ACCESS_DENIED: "O usuário dono do webhook não tem acesso a esses dados no Bitrix24.",
};

export async function call<T>(conn: Pick<Conn, "webhook_url">, method: string, params: Record<string, unknown>): Promise<{ result: T; next?: number }> {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${conn.webhook_url}${method}.json`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(params) });
    } catch { throw new Error("Não foi possível falar com o portal Bitrix24. Confira o endereço do webhook."); }
    const body = (await res.json().catch(() => ({}))) as { result?: T; next?: number; error?: string; error_description?: string };
    if ((body.error === "QUERY_LIMIT_EXCEEDED" || res.status === 503) && attempt < 3) { await new Promise((r) => setTimeout(r, 1000 * (attempt + 1))); continue; }
    if (!res.ok || body.error) {
      const known = body.error ? ERRORS[body.error] : undefined;
      throw new Error(known ?? `Bitrix24: ${body.error_description || body.error || res.status}`);
    }
    return { result: body.result as T, ...(body.next !== undefined ? { next: body.next } : {}) };
  }
}

/** Confirms the webhook works and can read the CRM before saving it. */
export async function testWebhook(webhookUrl: string) {
  const { result } = await call<{ ID?: string; NAME?: string; LAST_NAME?: string; ADMIN?: boolean }>({ webhook_url: webhookUrl }, "profile", {});
  await call({ webhook_url: webhookUrl }, "crm.deal.list", { select: ["ID"], start: 0 });
  return { userName: [result?.NAME, result?.LAST_NAME].filter(Boolean).join(" ") || "Usuário", isAdmin: !!result?.ADMIN };
}

type Deal = { ID: string; TITLE?: string; STAGE_ID?: string; CATEGORY_ID?: string; OPPORTUNITY?: string; CURRENCY_ID?: string; ASSIGNED_BY_ID?: string; CLOSED?: string; DATE_CREATE?: string; CLOSEDATE?: string; DATE_MODIFY?: string };

type BxUser = { ID: string; NAME?: string; LAST_NAME?: string; PERSONAL_PHOTO?: string; UF_DEPARTMENT?: number[]; ACTIVE?: boolean };
type BxStatus = { STATUS_ID: string; NAME: string; SORT: string | number; ENTITY_ID: string; EXTRA?: { SEMANTICS?: string }; SEMANTICS?: string };

/** Users (names, photos, departments) and pipeline stage names; best-effort so a missing scope never blocks deal sync. */
async function syncMeta(db: Awaited<ReturnType<typeof admin>>, conn: Conn, companyId: string) {
  try {
    const depts = new Map<string, string>();
    try {
      const { result } = await call<{ ID: string; NAME: string }[]>(conn, "department.get", {});
      (result ?? []).forEach((d) => depts.set(String(d.ID), d.NAME));
    } catch { /* optional */ }
    const users: BxUser[] = [];
    let start = 0, pages = 0;
    do {
      const { result, next } = await call<BxUser[]>(conn, "user.get", { start, FILTER: { USER_TYPE: "employee" } });
      users.push(...(result ?? []));
      start = next ?? -1; pages++;
    } while (start >= 0 && pages < 20);
    const urows = users.map((u) => ({
      company_id: companyId, user_id: String(u.ID),
      name: [u.NAME, u.LAST_NAME].filter(Boolean).join(" ").trim() || `Usuário ${u.ID}`,
      photo: u.PERSONAL_PHOTO || null,
      department: depts.get(String(u.UF_DEPARTMENT?.[0] ?? "")) ?? null,
      active: u.ACTIVE !== false,
    }));
    if (urows.length) await db.from("bitrix_users" as never).upsert(urows as never, { onConflict: "company_id,user_id" });
  } catch (e) { console.error("bitrix user sync", e); }
  try {
    const cats = new Map<string, string>([["0", "Funil geral"]]);
    try {
      const { result } = await call<{ categories?: { id: number; name: string }[] }>(conn, "crm.category.list", { entityTypeId: 2 });
      (result?.categories ?? []).forEach((c) => cats.set(String(c.id), c.name));
    } catch { /* optional */ }
    const all: BxStatus[] = [];
    let st = 0, pg = 0;
    do {
      const { result, next } = await call<BxStatus[]>(conn, "crm.status.list", { order: { SORT: "ASC" }, start: st });
      all.push(...(result ?? []));
      st = next ?? -1; pg++;
    } while (st >= 0 && pg < 40);
    const srows = all.filter((s) => s.ENTITY_ID === "DEAL_STAGE" || s.ENTITY_ID.startsWith("DEAL_STAGE_")).map((s) => {
      const cat = s.ENTITY_ID === "DEAL_STAGE" ? "0" : s.ENTITY_ID.slice("DEAL_STAGE_".length);
      return { company_id: companyId, stage_id: s.STATUS_ID, category_id: cat, category_name: cats.get(cat) ?? `Funil ${cat}`, name: s.NAME, sort: Number(s.SORT) || 0, semantics: s.EXTRA?.SEMANTICS ?? s.SEMANTICS ?? null };
    });
    if (srows.length) await db.from("bitrix_stages" as never).upsert(srows as never, { onConflict: "company_id,stage_id" });
  } catch (e) { console.error("bitrix stage sync", e); }
}

type BxActivity = { ID: string; TYPE_ID?: string; PROVIDER_ID?: string; PROVIDER_TYPE_ID?: string; SUBJECT?: string; RESPONSIBLE_ID?: string; OWNER_TYPE_ID?: string; OWNER_ID?: string; COMPLETED?: string; CREATED?: string; DEADLINE?: string; START_TIME?: string; END_TIME?: string };
type BxTask = { id: string; title?: string; responsibleId?: string; status?: string; createdDate?: string; deadline?: string | null; closedDate?: string | null };

export function activityType(a: { TYPE_ID?: string | undefined; PROVIDER_ID?: string | undefined }): string {
  if (a.TYPE_ID === "2") return "call";
  if (a.TYPE_ID === "1") return "meeting";
  if (a.TYPE_ID === "4") return "email";
  const p = (a.PROVIDER_ID ?? "").toUpperCase();
  if (p.includes("CALL")) return "call";
  if (p.includes("MEETING")) return "meeting";
  if (p.includes("MAIL")) return "email";
  if (p.includes("IMOPENLINES") || p.includes("WHATSAPP") || p.includes("SMS")) return "chat";
  return "task";
}

/** Last 180 days of CRM activities and tasks; best-effort so a missing scope never blocks deal sync. */
async function syncWork(db: Awaited<ReturnType<typeof admin>>, conn: Conn, companyId: string) {
  const since = new Date(Date.now() - 180 * 864e5).toISOString();
  try {
    let start = 0, pages = 0;
    do {
      const { result, next } = await call<BxActivity[]>(conn, "crm.activity.list", {
        order: { ID: "DESC" }, filter: { ">=CREATED": since },
        select: ["ID", "TYPE_ID", "PROVIDER_ID", "PROVIDER_TYPE_ID", "SUBJECT", "RESPONSIBLE_ID", "OWNER_TYPE_ID", "OWNER_ID", "COMPLETED", "CREATED", "DEADLINE", "START_TIME", "END_TIME"], start,
      });
      const rows = (result ?? []).map((a) => ({
        company_id: companyId, activity_id: String(a.ID), type: activityType(a), subject: a.SUBJECT ?? null,
        responsible_id: a.RESPONSIBLE_ID ?? null, owner_type_id: a.OWNER_TYPE_ID ?? null, owner_id: a.OWNER_ID ?? null,
        completed: a.COMPLETED === "Y", created_at: a.CREATED || null, deadline: a.DEADLINE || null, synced_at: new Date().toISOString(),
        provider: a.PROVIDER_ID ?? null, start_time: a.START_TIME || null, end_time: a.END_TIME || null,
        channel: (a.PROVIDER_ID ?? "").toUpperCase().includes("IMOPENLINES") ? channelOf(`${a.SUBJECT ?? ""} ${a.PROVIDER_TYPE_ID ?? ""}`) : null,
      }));
      if (rows.length) await db.from("bitrix_activities").upsert(rows, { onConflict: "company_id,activity_id" });
      start = next ?? -1; pages++;
    } while (start >= 0 && pages < 30);
  } catch (e) { console.error("bitrix activity sync", e); }
  try {
    let start = 0, pages = 0;
    do {
      const { result, next } = await call<{ tasks?: BxTask[] }>(conn, "tasks.task.list", {
        order: { ID: "DESC" }, filter: { ">=CREATED_DATE": since },
        select: ["ID", "TITLE", "RESPONSIBLE_ID", "STATUS", "CREATED_DATE", "DEADLINE", "CLOSED_DATE"], start,
      });
      const rows = (result?.tasks ?? []).map((t) => ({
        company_id: companyId, task_id: String(t.id), title: t.title ?? null, responsible_id: t.responsibleId ?? null,
        status: t.status ?? null, created_at: t.createdDate || null, deadline: t.deadline || null, closed_at: t.closedDate || null,
        synced_at: new Date().toISOString(),
      }));
      if (rows.length) await db.from("bitrix_tasks").upsert(rows, { onConflict: "company_id,task_id" });
      start = next ?? -1; pages++;
    } while (start >= 0 && pages < 20);
  } catch (e) { console.error("bitrix task sync", e); }
}

const MAX_PAGES = 40; // até 2.000 negócios por execução, para caber no tempo do servidor

/**
 * Resumable sync. While the first full import is unfinished, each run continues from `sync_cursor`.
 * After it finishes, runs fetch only deals modified since the last sync (with 1h overlap).
 */
export async function syncDeals(companyId: string) {
  const db = await admin();
  const { data: row, error } = await db.from("bitrix_connections").select("company_id, webhook_url, sync_cursor, last_full_sync_at, last_sync_at").eq("company_id", companyId).maybeSingle();
  if (error || !row || !row.webhook_url) throw new Error("Empresa sem portal Bitrix24 conectado.");
  await db.from("bitrix_connections").update({ last_sync_status: "running", last_sync_error: null }).eq("company_id", companyId);
  try {
    const conn: Conn = { company_id: row.company_id, webhook_url: row.webhook_url };
    const full = !row.last_full_sync_at;
    const cursor = full ? row.sync_cursor ?? 0 : 0;
    if (cursor === 0) { await syncMeta(db, conn, companyId); await syncWork(db, conn, companyId); }
    const since = !full && row.last_sync_at ? new Date(new Date(row.last_sync_at).getTime() - 3600_000).toISOString() : null;
    const startedAt = new Date().toISOString();
    let start = cursor, pages = 0, total = 0;
    do {
      const { result, next } = await call<Deal[]>(conn, "crm.deal.list", {
        order: { ID: "ASC" },
        ...(since ? { filter: { ">DATE_MODIFY": since } } : {}),
        select: ["ID", "TITLE", "STAGE_ID", "CATEGORY_ID", "OPPORTUNITY", "CURRENCY_ID", "ASSIGNED_BY_ID", "CLOSED", "DATE_CREATE", "CLOSEDATE", "DATE_MODIFY"],
        start,
      });
      const rows = (result ?? []).map((d) => ({
        company_id: companyId, deal_id: String(d.ID), title: d.TITLE ?? null, stage_id: d.STAGE_ID ?? null, category_id: d.CATEGORY_ID ?? null,
        opportunity: Number(d.OPPORTUNITY ?? 0) || 0, currency: d.CURRENCY_ID ?? null, assigned_by_id: d.ASSIGNED_BY_ID ?? null,
        closed: d.CLOSED === "Y", date_create: d.DATE_CREATE || null, close_date: d.CLOSEDATE ? d.CLOSEDATE.slice(0, 10) : null,
        date_modify: d.DATE_MODIFY || null, synced_at: new Date().toISOString(),
      }));
      if (rows.length) {
        const up = await db.from("bitrix_deals").upsert(rows, { onConflict: "company_id,deal_id" });
        if (up.error) throw new Error("Falha ao gravar negócios.");
      }
      total += rows.length; pages++;
      start = next ?? -1;
      if (full) await db.from("bitrix_connections").update({ sync_cursor: start >= 0 ? start : 0 }).eq("company_id", companyId);
    } while (start >= 0 && pages < MAX_PAGES);
    const partial = start >= 0;
    const { count } = await db.from("bitrix_deals").select("deal_id", { count: "exact", head: true }).eq("company_id", companyId);
    await db.from("bitrix_connections").update({
      last_sync_at: partial ? row.last_sync_at : startedAt, last_sync_status: partial ? "partial" : "ok", deals_count: count ?? total,
      ...(full && !partial ? { last_full_sync_at: startedAt, sync_cursor: 0 } : {}),
    }).eq("company_id", companyId);
    return { imported: total, partial };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    await db.from("bitrix_connections").update({ last_sync_status: "error", last_sync_error: msg.slice(0, 300) }).eq("company_id", companyId);
    throw new Error(msg);
  }
}

/** Runs one sync batch for every connected company; used by the hourly schedule. */
export async function syncAll() {
  const db = await admin();
  const { data } = await db.from("bitrix_connections").select("company_id").not("webhook_url", "is", null);
  const out: { companyId: string; ok: boolean; partial?: boolean }[] = [];
  for (const c of data ?? []) {
    try { const r = await syncDeals(c.company_id); out.push({ companyId: c.company_id, ok: true, partial: r.partial }); }
    catch { out.push({ companyId: c.company_id, ok: false }); }
  }
  return out;
}
