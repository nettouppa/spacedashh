import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getVoiceSettings, saveAtlasPersonality } from "@/lib/ai-settings.functions";
import { AtlasIcon } from "./atlas";

export function AtlasPersonalitySettings({ companyId, canManage, connected }: { companyId: string; canManage: boolean; connected: boolean }) {
  const qc = useQueryClient();
  const load = useServerFn(getVoiceSettings);
  const save = useServerFn(saveAtlasPersonality);
  const q = useQuery({ queryKey: ["voice-settings", companyId], queryFn: () => load({ data: { companyId } }) });
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { setInstructions(q.data?.personality.instructions ?? ""); setMessage(null); }, [q.data, companyId]);
  const disabled = !canManage || !connected || q.isLoading || q.isError || busy;
  async function submit() {
    setBusy(true); setMessage(null);
    try {
      const r = await save({ data: { companyId, personality: { instructions } } });
      setMessage(r.ok ? { ok: true, text: "Personalidade do Atlas salva." } : { ok: false, text: r.error });
      if (r.ok) await qc.invalidateQueries({ queryKey: ["voice-settings", companyId] });
    } catch { setMessage({ ok: false, text: "Não foi possível salvar a personalidade. Tente novamente." }); }
    finally { setBusy(false); }
  }
  return <section className="mt-6 border-y border-border py-6">
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><AtlasIcon className="size-6" /></span>
      <div><h2 className="font-semibold">Personalidade do Atlas</h2><p className="mt-1 text-sm font-medium text-primary">Comandante de Missão</p></div>
    </div>
    <p className="mt-3 text-sm text-muted-foreground">Calmo, analítico e direto. Clareza nos números, atenção aos riscos e foco na rota para a meta.</p>
    <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className="mt-5 max-w-2xl space-y-3">
      <label htmlFor="atlas-instructions" className="block text-sm font-medium">Diretrizes da empresa</label>
      <Textarea id="atlas-instructions" value={instructions} maxLength={2000} rows={4} disabled={disabled}
        placeholder="Ex.: priorize negócios sem atividade e mantenha um tom acolhedor e objetivo."
        onChange={(e) => setInstructions(e.target.value)} />
      <div className="text-right text-xs tabular-nums text-muted-foreground">{instructions.length}/2000</div>
      {!connected && <p className="text-xs text-warning">Conecte a OpenAI para salvar as diretrizes.</p>}
      {q.isError && <p role="alert" className="text-xs text-danger">Não foi possível carregar as diretrizes.</p>}
      {canManage && <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={disabled}><Save />{busy ? "Salvando…" : "Salvar personalidade"}</Button>
        <Button type="button" variant="ghost" disabled={disabled} onClick={() => setInstructions("")}><RotateCcw />Restaurar personalidade padrão</Button>
      </div>}
      {message && <p role="status" className={`text-xs ${message.ok ? "text-success" : "text-danger"}`}>{message.text}</p>}
    </form>
  </section>;
}