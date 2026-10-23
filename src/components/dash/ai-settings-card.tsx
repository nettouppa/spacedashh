import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAiStatus, saveAiKey, removeAiKey } from "@/lib/ai-settings.functions";
import { OPENAI_MODELS, DEFAULT_OPENAI_MODEL, type OpenAiModel } from "@/lib/ai-policy";
import { AtlasIcon } from "./atlas";

export function AiSettingsCard({ companyId, canManage }: { companyId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const status = useServerFn(getAiStatus);
  const save = useServerFn(saveAiKey);
  const remove = useServerFn(removeAiKey);
  const q = useQuery({ queryKey: ["ai-status", companyId], queryFn: () => status({ data: { companyId } }) });
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState("");
  const [model, setModel] = useState<OpenAiModel | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const s = q.data;
  const current = (model ?? (s?.model as OpenAiModel | null) ?? DEFAULT_OPENAI_MODEL);
  const showForm = canManage && (!s?.connected || editing);

  async function submit(withKey: boolean) {
    setBusy(true); setMsg(null);
    try {
      const r = await save({ data: { companyId, model: current, ...(withKey ? { apiKey: key.trim() } : {}) } });
      if (!r.ok) { setMsg({ ok: false, text: r.error }); return; }
      setKey(""); setEditing(false); setModel(null);
      setMsg({ ok: true, text: "OpenAI conectada. O Atlas já usa esta chave." });
      await qc.invalidateQueries({ queryKey: ["ai-status", companyId] });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Erro inesperado." }); }
    finally { setBusy(false); }
  }
  async function del() {
    if (!confirm("Remover a chave da OpenAI? O Atlas deixará de responder nesta empresa.")) return;
    setBusy(true);
    try { await remove({ data: { companyId } }); setMsg(null); await qc.invalidateQueries({ queryKey: ["ai-status", companyId] }); }
    finally { setBusy(false); }
  }

  return <section className="mt-6 rounded-xl border border-border bg-card p-5">
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><AtlasIcon className="size-6" /></span>
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold">Inteligência artificial (OpenAI)</h2>
        <p className="mt-1 text-sm text-muted-foreground">O Atlas usa a conta OpenAI desta empresa no chat, no microfone e no modo conversa por voz.</p>
        <p className="mt-3 text-sm">{q.isLoading ? "Verificando…" : s?.connected
          ? <><span className="font-medium text-success">Conectada</span> · chave terminada em ••••{s.last4} · modelo {s.model}</>
          : <span className="text-muted-foreground">Não conectada</span>}</p>
      </div>
    </div>
    {canManage && s?.connected && !editing && <div className="mt-4 flex flex-wrap gap-2">
      <Button variant="outline" disabled={busy} onClick={() => setEditing(true)}><KeyRound />Trocar chave ou modelo</Button>
      <Button variant="outline" disabled={busy} onClick={() => void del()}><Trash2 />Remover</Button>
    </div>}
    {showForm && <form className="mt-4 grid max-w-xl gap-3" onSubmit={(e) => { e.preventDefault(); void submit(true); }}>
      <input aria-label="Chave da OpenAI" type="password" autoComplete="off" placeholder="sk-..." value={key} onChange={(e) => setKey(e.target.value)} className="h-10 rounded-md border border-border bg-card px-3 font-mono text-sm" />
      <select aria-label="Modelo" value={current} onChange={(e) => setModel(e.target.value as OpenAiModel)} className="h-10 rounded-md border border-border bg-card px-3 text-sm">
        {OPENAI_MODELS.map((m) => <option key={m} value={m}>{m}{m === DEFAULT_OPENAI_MODEL ? " (recomendado)" : ""}</option>)}
      </select>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy || key.trim().length < 20}>{busy ? "Testando…" : "Testar e salvar"}</Button>
        {s?.connected && <Button type="button" variant="outline" disabled={busy} onClick={() => void submit(false)}>Salvar só o modelo</Button>}
        {editing && <Button type="button" variant="ghost" onClick={() => { setEditing(false); setKey(""); setModel(null); }}>Cancelar</Button>}
      </div>
      <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 size-3.5 shrink-0" />A chave fica guardada só no servidor e nunca é exibida de novo.</p>
    </form>}
    {!canManage && !s?.connected && <p className="mt-3 text-xs text-muted-foreground">Peça ao gestor da empresa para conectar a OpenAI.</p>}
    {msg && <p role="status" className={`mt-3 text-xs ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</p>}
  </section>;
}
