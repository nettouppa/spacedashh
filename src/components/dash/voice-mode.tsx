/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { sfx } from "@/lib/atlas-sound";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getVoiceSettings, speakWithOpenAi } from "@/lib/ai-settings.functions";
import { DEFAULT_VOICE, type VoiceSettings } from "@/lib/voice-settings";
import { Mic, MicOff, Square, X } from "lucide-react";
import { askAssistant, type AiAction } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";
import { AtlasIcon } from "./atlas";

type Turn = { role: "user" | "assistant"; content: string };
type Phase = "listening" | "thinking" | "speaking" | "muted" | "idle";

export function voiceSupported() {
  if (typeof window === "undefined") return false;
  const w = window as any;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition) && "speechSynthesis" in window;
}

export function VoiceMode({ history, context, onAction, onClose, companyId }: {
  companyId: string; history: Turn[]; context: () => string; onAction: (a: AiAction) => void; onClose: (turns: Turn[]) => void;
}) {
  const ask = useServerFn(askAssistant);
  const tts = useServerFn(speakWithOpenAi);
  const loadVs = useServerFn(getVoiceSettings);
  const vsQ = useQuery({ queryKey: ["voice-settings", companyId], queryFn: () => loadVs({ data: { companyId } }), staleTime: 60_000 });
  const vs = useRef<VoiceSettings>(DEFAULT_VOICE);
  vs.current = vsQ.data ?? DEFAULT_VOICE;
  const audio = useRef<HTMLAudioElement | null>(null);
  const silence = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [heard, setHeard] = useState("");
  const [said, setSaid] = useState("");
  const turns = useRef<Turn[]>([]);
  const rec = useRef<any>(null);
  const alive = useRef(true);
  const phaseRef = useRef<Phase>("idle");
  const setP = (p: Phase) => { phaseRef.current = p; setPhase(p); };

  function listen() {
    if (!alive.current || !rec.current) return;
    setHeard(""); setP("listening");
    try { rec.current.abort(); } catch { /* */ }
    setTimeout(() => { if (alive.current && phaseRef.current === "listening") { try { rec.current.start(); } catch { /* já ativo */ } } }, 120);
  }

  function stopSpeech() {
    window.speechSynthesis.cancel();
    if (audio.current) { audio.current.pause(); audio.current = null; }
  }

  function afterSpeech() { if (alive.current && phaseRef.current === "speaking") listen(); }

  // O microfone fica desligado enquanto o Atlas fala: abrir aqui fazia ele ouvir
  // a própria voz, se interromper e reenviar a pergunta em loop.
  function startBargeIn() { /* interrupção pelo botão */ }

  function speakBrowser(clean: string) {
    const synth = window.speechSynthesis;
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = "pt-BR"; u.rate = vs.current.rate; u.pitch = vs.current.pitch;
    const voices = synth.getVoices();
    const v = (vs.current.voiceName && voices.find((x) => x.name === vs.current.voiceName))
      ?? voices.find((x) => x.lang.toLowerCase().startsWith("pt-br")) ?? voices.find((x) => x.lang.toLowerCase().startsWith("pt"));
    if (v) u.voice = v;
    u.onend = afterSpeech; u.onerror = afterSpeech;
    synth.speak(u);
    startBargeIn();
  }

  async function speak(text: string) {
    stopSpeech();
    const clean = text.replace(/[*_#`>|]/g, "");
    setSaid(text); setP("speaking"); sfx.speak();
    if (vs.current.tts === "openai") {
      try {
        const r = await tts({ data: { companyId, text: clean.slice(0, 2000) } });
        if (r.audio && alive.current && phaseRef.current === "speaking") {
          const a = new Audio(`data:audio/mpeg;base64,${r.audio}`);
          a.playbackRate = vs.current.rate;
          a.onended = afterSpeech; a.onerror = afterSpeech;
          audio.current = a;
          await a.play();
          startBargeIn();
          return;
        }
      } catch { /* cai para a voz do navegador */ }
    }
    if (alive.current && phaseRef.current === "speaking") speakBrowser(clean);
  }

  async function think(text: string) {
    if (phaseRef.current === "thinking") return;
    setP("thinking"); sfx.micClose();
    const pulse = setInterval(() => { if (phaseRef.current === "thinking") sfx.thinking(); else clearInterval(pulse); }, 1200);
    turns.current.push({ role: "user", content: text });
    try {
      const msgs = [...history, ...turns.current].slice(-20);
      const r = await ask({ data: { messages: msgs, context: context(), voice: true, companyId } });
      if (!alive.current) return;
      if (r.action) onAction(r.action);
      turns.current.push({ role: "assistant", content: r.reply });
      void speak(r.reply);
    } catch {
      if (alive.current) void speak("Não consegui responder agora. Tente novamente.");
    }
  }

  useEffect(() => {
    alive.current = true;
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "pt-BR"; r.interimResults = true; r.continuous = true;
    let text = "";
    r.onstart = () => { text = ""; };
    r.onresult = (e: any) => {
      text = Array.from(e.results).map((x: any) => x[0].transcript).join("");
      if (phaseRef.current !== "listening") return;
      setHeard(text);
      if (silence.current) clearTimeout(silence.current);
      silence.current = setTimeout(() => { try { r.stop(); } catch { /* */ } }, vs.current.silenceMs);
    };
    r.onend = () => {
      if (silence.current) clearTimeout(silence.current);
      if (!alive.current || phaseRef.current !== "listening") return;
      const said = text.trim(); text = "";
      if (said) void think(said);
      else setTimeout(listen, 200);
    };
    r.onerror = (e: any) => { if (e.error === "not-allowed") setP("muted"); };
    rec.current = r;
    window.speechSynthesis.getVoices();
    sfx.connect();
    setTimeout(listen, 350);
    return () => { alive.current = false; r.abort(); stopSpeech(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = () => {
    if (phase === "muted") listen();
    else { setP("muted"); rec.current?.abort(); }
  };
  const interrupt = () => { sfx.bargeIn(); stopSpeech(); rec.current?.abort(); setP("listening"); setTimeout(listen, 150); };
  const close = () => { sfx.disconnect(); alive.current = false; rec.current?.abort(); stopSpeech(); onClose(turns.current); };

  const label = { listening: "Ouvindo…", thinking: "Pensando…", speaking: "Atlas falando", muted: "Microfone silenciado", idle: "Iniciando…" }[phase];

  return (
    <div className="atlas-in absolute inset-0 z-10 flex flex-col bg-card">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs font-medium uppercase tracking-wider text-subtle-foreground">Conversa por voz</span>
        <button onClick={close} aria-label="Encerrar conversa por voz" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-4" /></button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="relative grid size-44 place-items-center">
          <span className={cn("absolute inset-0 rounded-full bg-primary/10 transition", phase === "listening" && "voice-ring", phase === "speaking" && "voice-wave")} />
          <span className={cn("absolute inset-5 rounded-full bg-primary/15 transition", phase === "listening" && "voice-ring [animation-delay:400ms]", phase === "speaking" && "voice-wave [animation-delay:200ms]")} />
          <span className={cn("relative grid size-24 place-items-center rounded-full bg-primary-soft text-primary ring-1 ring-primary/20", phase === "muted" && "opacity-50")}>
            <AtlasIcon className="size-12" />
          </span>
        </div>
        <div className="mt-6 flex items-center gap-2 text-sm font-medium">
          {label}
          {phase === "thinking" && <span className="flex gap-0.5">{[0, 1, 2].map((d) => <span key={d} className="atlas-dot size-1 rounded-full bg-primary" style={{ animationDelay: `${d * 150}ms` }} />)}</span>}
        </div>
        <p className="mt-3 min-h-[4.5rem] max-w-xs text-[15px] leading-relaxed text-muted-foreground">
          {phase === "speaking" ? said : phase === "listening" ? (heard || "Pergunte algo sobre suas vendas") : phase === "thinking" ? `“${heard}”` : ""}
        </p>
      </div>

      <div className="flex items-center justify-center gap-4 pb-8">
        <button onClick={toggleMute} aria-label={phase === "muted" ? "Ativar microfone" : "Silenciar microfone"}
          className={cn("grid size-12 place-items-center rounded-full border border-border transition", phase === "muted" ? "bg-danger-soft text-danger" : "bg-background text-foreground hover:bg-muted")}>
          {phase === "muted" ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </button>
        <button onClick={interrupt} disabled={phase !== "speaking"} aria-label="Interromper Atlas"
          className="grid size-12 place-items-center rounded-full border border-border bg-background text-foreground transition hover:bg-muted disabled:opacity-40">
          <Square className="size-4 fill-current" />
        </button>
        <button onClick={close} aria-label="Encerrar" className="grid size-12 place-items-center rounded-full bg-danger text-primary-foreground transition hover:opacity-90">
          <X className="size-5" />
        </button>
      </div>
    </div>
  );
}
