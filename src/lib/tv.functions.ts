import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { RawDataset } from "@/lib/crm-data";
import type { View } from "@/lib/views";

const ViewSchema = z.object({ id: z.string().max(64), name: z.string().max(80), order: z.array(z.string().max(32)).max(30), sizes: z.record(z.string(), z.number()) });

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Active TV links of a company (RLS: gestor/admin only). Tokens are never returned after creation. */
export const listTvLinks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase.from("tv_links")
      .select("id, name, interval_sec, created_at, last_seen_at").eq("company_id", data.companyId).is("revoked_at", null).order("created_at", { ascending: false });
    return rows ?? [];
  });

/** Creates a TV link; returns the raw token once (only its hash is stored). */
export const createTvLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid(), name: z.string().trim().min(1).max(60), intervalSec: z.number().int().min(10).max(600), views: z.array(ViewSchema).min(1).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const { error } = await context.supabase.from("tv_links").insert({
      company_id: data.companyId, name: data.name, interval_sec: data.intervalSec, views: data.views, token_hash: await sha256(token), created_by: context.userId,
    });
    if (error) throw new Error("Apenas gestores podem criar links de TV.");
    return { token };
  });

export const revokeTvLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("tv_links").update({ revoked_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw new Error("Não foi possível revogar o link.");
    return { ok: true };
  });

/** Public: resolves a TV token to its company's dashboard data. The token is the only credential; revoked/unknown tokens get nothing. */
export const getTvData = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(20).max(100).regex(/^[A-Za-z0-9_-]+$/) }).parse(d))
  .handler(async ({ data }): Promise<{ name: string; intervalSec: number; views: View[]; dataset: RawDataset | null; goals: { month: string; seller_ref: string; amount: number }[] } | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin.from("tv_links")
      .select("id, company_id, name, views, interval_sec").eq("token_hash", await sha256(data.token)).is("revoked_at", null).maybeSingle();
    if (!link) return null;
    const { loadDataset } = await import("@/lib/dashboard-load");
    const [dataset, goals] = await Promise.all([
      loadDataset(supabaseAdmin as unknown as SupabaseClient, link.company_id),
      supabaseAdmin.from("sales_goals").select("month, seller_ref, amount").eq("company_id", link.company_id),
      supabaseAdmin.from("tv_links").update({ last_seen_at: new Date().toISOString() }).eq("id", link.id),
    ]);
    return {
      name: link.name, intervalSec: link.interval_sec, views: link.views as unknown as View[], dataset,
      goals: (goals.data ?? []).map((r) => ({ month: r.month, seller_ref: r.seller_ref, amount: Number(r.amount) })),
    };
  });
