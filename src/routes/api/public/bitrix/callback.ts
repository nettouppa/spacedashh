import { createFileRoute } from "@tanstack/react-router";
import { canBindPortal, isStateValid, normalizePortalDomain } from "@/lib/bitrix-policy";

const back = (status: string) =>
  new Response(null, { status: 302, headers: { Location: `/integrations?bitrix=${status}`, "Cache-Control": "no-store" } });

export const Route = createFileRoute("/api/public/bitrix/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const domain = normalizePortalDomain(url.searchParams.get("domain") ?? "");
        if (!code || !state || state.length > 200 || code.length > 500) return back("invalid");
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        // Single-use, short-lived state created by an authenticated manager binds the portal to one company.
        const { data: st } = await db.from("bitrix_oauth_states").select("*").eq("nonce", state).maybeSingle();
        if (!st || !isStateValid(new Date(st.created_at), st.used_at ? new Date(st.used_at) : null, new Date())) return back("expired");
        const mark = await db.from("bitrix_oauth_states").update({ used_at: new Date().toISOString() }).eq("nonce", state).is("used_at", null).select("nonce");
        if (!mark.data?.length) return back("expired");
        if (domain && domain !== st.domain) return back("mismatch");
        try {
          const { exchangeCode } = await import("@/lib/bitrix.server");
          const t = await exchangeCode(code);
          const { data: existing } = await db.from("bitrix_connections").select("company_id").eq("member_id", t.member_id).maybeSingle();
          if (!canBindPortal(existing?.company_id ?? null, st.company_id)) return back("taken");
          const endpoint = t.client_endpoint || `https://${st.domain}/rest/`;
          const up = await db.from("bitrix_connections").upsert({
            company_id: st.company_id, domain: st.domain, member_id: t.member_id, client_endpoint: endpoint,
            access_token: t.access_token, refresh_token: t.refresh_token,
            expires_at: new Date(Date.now() + t.expires_in * 1000).toISOString(),
            connected_by: st.user_id, connected_at: new Date().toISOString(),
          }, { onConflict: "company_id" });
          if (up.error) return back("error");
          return back("connected");
        } catch {
          return back("denied");
        }
      },
    },
  },
});
