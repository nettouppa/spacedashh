import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";

const Msg = z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(20000), topic: z.string().max(200).optional(), action: z.object({ label: z.string().max(300) }).optional() });

/** Own conversations in a company (RLS: owner + member). */
export const listConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ companyId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.from("atlas_conversations")
      .select("id, title, pinned, mode, updated_at, messages").eq("company_id", data.companyId)
      .order("updated_at", { ascending: false }).limit(200);
    if (error) throw new Error("Não foi possível carregar as conversas.");
    return (rows ?? []).map((r) => {
      const msgs = (r.messages as { content?: string }[] | null) ?? [];
      return { id: r.id, title: r.title, pinned: r.pinned, mode: r.mode, updated_at: r.updated_at, preview: msgs.map((m) => m.content ?? "").join(" ").slice(0, 4000) };
    });
  });

export const getConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: r, error } = await context.supabase.from("atlas_conversations").select("id, title, messages").eq("id", data.id).maybeSingle();
    if (error || !r) throw new Error("Conversa não encontrada.");
    return { id: r.id, title: r.title, messages: (r.messages as z.infer<typeof Msg>[]) ?? [] };
  });

/** Creates (no id) or updates the messages of a conversation. */
export const saveConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    companyId: z.string().uuid(), id: z.string().uuid().optional(), title: z.string().min(1).max(120).optional(),
    mode: z.enum(["chat", "voice"]).optional(), messages: z.array(Msg).max(400),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const messages = data.messages as unknown as Json;
    if (data.id) {
      const patch: { messages: Json; updated_at: string; mode?: string } = { messages, updated_at: new Date().toISOString() };
      if (data.mode === "voice") patch.mode = "voice";
      const { error } = await sb.from("atlas_conversations").update(patch).eq("id", data.id);
      if (error) throw new Error("Não foi possível salvar a conversa.");
      return { id: data.id };
    }
    const { data: r, error } = await sb.from("atlas_conversations")
      .insert({ company_id: data.companyId, user_id: context.userId, title: data.title ?? "Nova conversa", mode: data.mode ?? "chat", messages })
      .select("id").single();
    if (error || !r) throw new Error("Não foi possível salvar a conversa.");
    return { id: r.id };
  });

export const updateConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), title: z.string().trim().min(1).max(120).optional(), pinned: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const patch: { title?: string; pinned?: boolean } = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.pinned !== undefined) patch.pinned = data.pinned;
    const { error } = await context.supabase.from("atlas_conversations").update(patch).eq("id", data.id);
    if (error) throw new Error("Não foi possível atualizar a conversa.");
    return { ok: true };
  });

export const deleteConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("atlas_conversations").delete().eq("id", data.id);
    if (error) throw new Error("Não foi possível excluir a conversa.");
    return { ok: true };
  });
