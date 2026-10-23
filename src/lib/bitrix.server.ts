// Server-only Bitrix24 OAuth + REST helpers. Never import from client code.
type Tokens = { access_token: string; refresh_token: string; expires_in: number; member_id: string; domain?: string; client_endpoint?: string };

function creds() {
  const id = process.env["BITRIX_CLIENT_ID"];
  const secret = process.env["BITRIX_CLIENT_SECRET"];
  if (!id || !secret) throw new Error("Credenciais do aplicativo Bitrix24 não configuradas.");
  return { id, secret };
}

export function clientId() { return creds().id; }

async function oauth(params: Record<string, string>): Promise<Tokens> {
  const { id, secret } = creds();
  const qs = new URLSearchParams({ ...params, client_id: id, client_secret: secret });
  const res = await fetch(`https://oauth.bitrix.info/oauth/token/?${qs}`);
  const body = (await res.json().catch(() => ({}))) as Partial<Tokens> & { error?: string };
  if (!res.ok || !body.access_token || !body.refresh_token || !body.member_id) {
    throw new Error(`Bitrix24 recusou a autorização${body.error ? ` (${body.error})` : ""}.`);
  }
  return body as Tokens;
}

export const exchangeCode = (code: string) => oauth({ grant_type: "authorization_code", code });
export const refreshTokens = (refresh: string) => oauth({ grant_type: "refresh_token", refresh_token: refresh });

type Conn = { company_id: string; domain: string; client_endpoint: string; access_token: string; refresh_token: string; expires_at: string };

async function admin() {
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function freshToken(conn: Conn): Promise<Conn> {
  if (new Date(conn.expires_at).getTime() - Date.now() > 60_000) return conn;
  const t = await refreshTokens(conn.refresh_token);
  const next = { ...conn, access_token: t.access_token, refresh_token: t.refresh_token, expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString() };
  await (await admin()).from("bitrix_connections").update({ access_token: next.access_token, refresh_token: next.refresh_token, expires_at: next.expires_at }).eq("company_id", conn.company_id);
  return next;
}

async function call<T>(conn: Conn, method: string, params: Record<string, unknown>): Promise<{ result: T; next?: number }> {
  const res = await fetch(`${conn.client_endpoint}${method}.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...params, auth: conn.access_token }),
  });
  const body = (await res.json().catch(() => ({}))) as { result?: T; next?: number; error?: string; error_description?: string };
  if (!res.ok || body.error) throw new Error(`Bitrix24: ${body.error_description || body.error || res.status}`);
  return { result: body.result as T, ...(body.next !== undefined ? { next: body.next } : {}) };
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

const MAX_PAGES = 40; // 2.000 negócios por execução, para caber no tempo do servidor

export async function syncDeals(companyId: string) {
  const db = await admin();
  const { data: row, error } = await db.from("bitrix_connections").select("company_id, domain, client_endpoint, access_token, refresh_token, expires_at").eq("company_id", companyId).maybeSingle();
  if (error || !row) throw new Error("Empresa sem portal Bitrix24 conectado.");
  await db.from("bitrix_connections").update({ last_sync_status: "running", last_sync_error: null }).eq("company_id", companyId);
  try {
    const conn = await freshToken(row);
    await syncMeta(db, conn, companyId);
    let start = 0, pages = 0, total = 0;
    do {
      const { result, next } = await call<Deal[]>(conn, "crm.deal.list", {
        order: { ID: "ASC" },
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
    } while (start >= 0 && pages < MAX_PAGES);
    const { count } = await db.from("bitrix_deals").select("deal_id", { count: "exact", head: true }).eq("company_id", companyId);
    await db.from("bitrix_connections").update({ last_sync_at: new Date().toISOString(), last_sync_status: start >= 0 ? "partial" : "ok", deals_count: count ?? total }).eq("company_id", companyId);
    return { imported: total, partial: start >= 0 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    await db.from("bitrix_connections").update({ last_sync_status: "error", last_sync_error: msg.slice(0, 300) }).eq("company_id", companyId);
    throw new Error(msg);
  }
}
