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

const MAX_PAGES = 40; // 2.000 negócios por execução, para caber no tempo do servidor

export async function syncDeals(companyId: string) {
  const db = await admin();
  const { data: row, error } = await db.from("bitrix_connections").select("company_id, domain, client_endpoint, access_token, refresh_token, expires_at").eq("company_id", companyId).maybeSingle();
  if (error || !row) throw new Error("Empresa sem portal Bitrix24 conectado.");
  await db.from("bitrix_connections").update({ last_sync_status: "running", last_sync_error: null }).eq("company_id", companyId);
  try {
    const conn = await freshToken(row);
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
