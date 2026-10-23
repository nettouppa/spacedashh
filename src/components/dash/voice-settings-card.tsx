import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { getVoiceSettings, saveVoiceSettings, speakWithOpenAi } from "@/lib/ai-settings.functions";
import { DEFAULT_VOICE, OPENAI_VOICES, RESPONSE_LENGTHS, type VoiceSettings } from "@/lib/voice-settings";
import { OPENAI_MODELS, MODEL_INFO } from "@/lib/ai-policy";

const SAMPLE = "Olá, eu sou o Atlas. Neste mês a equipe já atingiu 72% da meta.";

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div className="grid gap-2 py-4 sm:grid-cols-[240px_1fr] sm:items-center sm:gap-6">
    <div><p className="text-sm font-medium">{label}</p>{hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}</div>
    <div>{children}</div>
  </div>;
}

const sel = "h-9 w-full max-w-sm rounded-md border border-border bg-card px-3 text-sm";

export function VoiceSettingsCard({ companyId, canManage, connected }: { companyId: string; canManage: boolean; connected: boolean }) {
  const qc = useQueryClient();
  const load = useServerFn(getVoiceSettings);
  const save = useServerFn(saveVoiceSettings);
  const tts = useServerFn(speakWithOpenAi);
  const q = useQuery({ queryKey: ["voice-settings", companyId], queryFn: () => load({ data: { companyId } }) });
  const [v, setV] = useState<VoiceSettings>(DEFAULT_VOICE);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { if (q.data) setV(q.data); }, [q.data]);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const upd = () => setVoices(window.speechSynthesis.getVoices().filter((x) => x.lang.toLowerCase().startsWith("pt")));
    upd(); window.speechSynthesis.addEventListener("voiceschanged", upd);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", upd);
  }, []);
  const set = <K extends keyof VoiceSettings>(k: K, val: VoiceSettings[K]) => setV((s) => ({ ...s, [k]: val }));
  const off = !canManage || !connected;

  async function preview() {
    window.speechSynthesis?.cancel();
    if (v.tts === "openai") {
      const r = await tts({ data: { companyId, text: SAMPLE, voice: v.openaiVoice } });
      if (r.audio) { const a = new Audio(`data:audio/mpeg;base64,${r.audio}`); a.playbackRate = v.rate; void a.play(); return; }
      setMsg({ ok: false, text: "Não foi possível gerar a voz da OpenAI. Usando a voz do navegador." });
    }
    const u = new SpeechSynthesisUtterance(SAMPLE);
    u.lang = "pt-BR"; u.rate = v.rate; u.pitch = v.pitch;
    const voice = voices.find((x) => x.name === v.voiceName); if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  }
  async function submit() {
    setBusy(true); setMsg(null);
    try {
      const r = await save({ data: { companyId, settings: v } });
      setMsg(r.ok ? { ok: true, text: "Preferências do modo conversa salvas." } : { ok: false, text: r.error });
      if (r.ok) await qc.invalidateQueries({ queryKey: ["voice-settings", companyId] });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : "Erro inesperado." }); }
    finally { setBusy(false); }
  }

  return <section className="mt-6 rounded-xl border border-border bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="font-semibold">Modo conversa por voz</h2>
        <p className="mt-1 text-sm text-muted-foreground">Como o Atlas fala e escuta. Vale para todos desta empresa.</p></div>
      <Button variant="outline" size="sm" onClick={() => void preview()}><Play />Ouvir exemplo</Button>
    </div>
    {!connected && <p className="mt-3 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">Conecte a OpenAI acima para salvar estas preferências.</p>}
    {connected && !canManage && <p className="mt-3 text-xs text-muted-foreground">Somente o gestor pode alterar estas preferências.</p>}
    <fieldset disabled={off} className="mt-2 divide-y divide-border disabled:opacity-60">
      <Row label="Tipo de voz" hint="A voz da OpenAI é mais natural e gera custo na conta da empresa.">
        <select aria-label="Tipo de voz" className={sel} value={v.tts} onChange={(e) => set("tts", e.target.value as VoiceSettings["tts"])}>
          <option value="browser">Voz do navegador (grátis)</option><option value="openai">Voz realista da OpenAI</option>
        </select>
      </Row>
      {v.tts === "openai"
        ? <Row label="Voz da OpenAI"><select aria-label="Voz da OpenAI" className={sel} value={v.openaiVoice} onChange={(e) => set("openaiVoice", e.target.value as VoiceSettings["openaiVoice"])}>
            {OPENAI_VOICES.map((x) => <option key={x} value={x}>{x[0]!.toUpperCase() + x.slice(1)}</option>)}</select></Row>
        : <Row label="Voz do Atlas" hint="Vozes em português disponíveis neste navegador.">
            <select aria-label="Voz do Atlas" className={sel} value={v.voiceName ?? ""} onChange={(e) => set("voiceName", e.target.value || null)}>
              <option value="">Automática</option>{voices.map((x) => <option key={x.name} value={x.name}>{x.name}</option>)}
            </select></Row>}
      <Row label="Velocidade da fala" hint={`${v.rate.toFixed(2)}x`}>
        <Slider className="max-w-sm" min={0.7} max={1.5} step={0.05} value={[v.rate]} onValueChange={([x]) => set("rate", x!)} /></Row>
      {v.tts === "browser" && <Row label="Tom da voz" hint={v.pitch < 0.95 ? "Mais grave" : v.pitch > 1.05 ? "Mais agudo" : "Normal"}>
        <Slider className="max-w-sm" min={0.5} max={1.5} step={0.05} value={[v.pitch]} onValueChange={([x]) => set("pitch", x!)} /></Row>}
      <Row label="Tamanho das respostas">
        <select aria-label="Tamanho das respostas" className={sel} value={v.length} onChange={(e) => set("length", e.target.value as VoiceSettings["length"])}>
          {Object.entries(RESPONSE_LENGTHS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Row>
      <Row label="Pausa para responder" hint={`O Atlas responde após ${(v.silenceMs / 1000).toFixed(1)} s de silêncio.`}>
        <Slider className="max-w-sm" min={600} max={3000} step={100} value={[v.silenceMs]} onValueChange={([x]) => set("silenceMs", x!)} /></Row>
      <Row label="Interromper falando" hint="Comece a falar para cortar o Atlas. Melhor com fone de ouvido.">
        <Switch aria-label="Interromper falando" checked={v.bargeIn} onCheckedChange={(c) => set("bargeIn", c)} /></Row>
      <Row label="Modelo para voz" hint="Um modelo mais rápido deixa a conversa mais fluida.">
        <select aria-label="Modelo para voz" className={sel} value={v.voiceModel ?? ""} onChange={(e) => set("voiceModel", (e.target.value || null) as VoiceSettings["voiceModel"])}>
          <option value="">Mesmo modelo do chat</option>{OPENAI_MODELS.map((m) => <option key={m} value={m}>{MODEL_INFO[m].label}</option>)}</select></Row>
    </fieldset>
    {canManage && <div className="mt-4 flex flex-wrap gap-2">
      <Button disabled={busy || !connected} onClick={() => void submit()}>{busy ? "Salvando…" : "Salvar preferências"}</Button>
      <Button variant="ghost" disabled={busy || !connected} onClick={() => setV(DEFAULT_VOICE)}><RotateCcw />Restaurar padrão</Button>
    </div>}
    {msg && <p role="status" className={`mt-3 text-xs ${msg.ok ? "text-success" : "text-danger"}`}>{msg.text}</p>}
  </section>;
}
