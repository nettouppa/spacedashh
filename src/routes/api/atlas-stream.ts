import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { parseVoiceSettings } from "@/lib/voice-settings";
import { buildAtlasBody } from "@/lib/atlas-request";
import { NO_KEY_REPLY, openAiErrorMessage } from "@/lib/ai-policy";

const Input = z.object({
  companyId: z.string().uuid(),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(30),
  context: z.string().max(12000),
});

/** Streams Atlas voice answers as NDJSON: {t:"text",v} chunks, then {t:"action",v} and {t:"end"}. */
export const Route = createFileRoute("/api/atlas-stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace("Bearer ", "");
        if (!token || token.split(".").length !== 3) return new Response("Unauthorized", { status: 401 });
        const parsed = Input.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Bad request", { status: 400 });
        const data = parsed.data;
        const url = process.env.SUPABASE_URL!, pk = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const sb = createClient(url, pk, { global: { headers: { Authorization: `Bearer ${token}`, apikey: pk } }, auth: { persistSession: false, autoRefreshToken: false } });
        const { data: u } = await sb.auth.getUser(token);
        if (!u?.user) return new Response("Unauthorized", { status: 401 });
        const [member, admin] = await Promise.all([
          sb.rpc("is_member", { _user_id: u.user.id, _company_id: data.companyId }),
          sb.rpc("has_role", { _user_id: u.user.id, _role: "admin" }),
        ]);
        const enc = new TextEncoder();
        const line = (o: unknown) => enc.encode(JSON.stringify(o) + "\n");
        const once = (text: string) => new Response(new Blob([line({ t: "text", v: text }), line({ t: "end" })]), { headers: { "Content-Type": "application/x-ndjson" } });
        if (member.data !== true && admin.data !== true) return once("Você não tem acesso a esta empresa.");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: cfg } = await supabaseAdmin.from("ai_settings").select("api_key, model, voice_settings").eq("company_id", data.companyId).maybeSingle();
        if (!cfg?.api_key) return once(NO_KEY_REPLY);
        const body = buildAtlasBody({ cfgModel: cfg.model, vs: parseVoiceSettings(cfg.voice_settings), voice: true, context: data.context, messages: data.messages, stream: true });
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${cfg.api_key}`, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok || !res.body) {
          let code: string | null = null;
          try { code = (await res.json())?.error?.code ?? null; } catch { /* ignore */ }
          console.error("openai stream error", res.status, code);
          return once(openAiErrorMessage(res.status, code));
        }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        const stream = new ReadableStream({
          async start(ctrl) {
            let buf = "", args = "", sentText = false;
            try {
              for (;;) {
                const { value, done } = await reader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true });
                const parts = buf.split("\n"); buf = parts.pop() ?? "";
                for (const p of parts) {
                  const s = p.trim();
                  if (!s.startsWith("data:")) continue;
                  const payload = s.slice(5).trim();
                  if (payload === "[DONE]") continue;
                  try {
                    const d = JSON.parse(payload)?.choices?.[0]?.delta;
                    if (d?.content) { sentText = true; ctrl.enqueue(line({ t: "text", v: d.content })); }
                    for (const tc of d?.tool_calls ?? []) if (tc.function?.arguments) args += tc.function.arguments;
                  } catch { /* partial */ }
                }
              }
              if (args) {
                try {
                  const a = JSON.parse(args);
                  ctrl.enqueue(line({ t: "action", v: a }));
                  if (!sentText) ctrl.enqueue(line({ t: "text", v: a.reply || "Filtros aplicados." }));
                } catch { /* ignore */ }
              }
            } finally {
              ctrl.enqueue(line({ t: "end" }));
              ctrl.close();
            }
          },
        });
        return new Response(stream, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-cache" } });
      },
    },
  },
});
