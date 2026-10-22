/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
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

export function VoiceMode({ history, context, onAction, onClose }: {
  history: Turn[]; context: () => string; onAction: (a: AiAction) => void; onClose: (turns: Turn[]) => void;
}) {
  const ask = useServerFn(askAssistant);
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
    try { rec.current.start(); } catch { /* já ativo */ }
  }

  function speak(text: string) {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[*_#`>|]/g, ""));
    u.lang = "pt-BR"; u.rate = 1.05;
    const v = synth.getVoices().find((x) => x.lang.toLowerCase().startsWith("pt-br")) ?? synth.getVoices().find((x) => x.lang.toLowerCase().startsWith("pt"));
    if (v) u.voice = v;
    u.onend = () => { if (alive.current && phaseRef.current === "speaking") listen(); };
    u.onerror = () => { if (alive.current && phaseRef.current === "speaking") listen(); };
    setSaid(text); setP("speaking");
    synth.speak(u);
  }

  async function think(text: string) {
    setP("thinking");
    turns.current.push({ role: "user", content: text });
    try {
      const msgs = [...history, ...turns.current].slice(-20);
      const r = await ask({ data: { messages: msgs, context: context(), voice: true } });
      if (!alive.current) return;
      if (r.action) onAction(r.action);
      turns.current.push({ role: "assistant", content: r.reply });
      speak(r.reply);
    } catch {
      if (alive.current) speak("Não consegui responder agora. Tente novamente.");
    }
  }

  useEffect(() => {
    alive.current = true;
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "pt-BR"; r.interimResults = true; r.continuous = false;
    let text = "";
    r.onstart = () => { text = ""; };
    r.onresult = (e: any) => {
      text = Array.from(e.results).map((x: any) => x[0].transcript).join("");
      setHeard(text);
    };
    r.onend = () => {
      if (!alive.current || phaseRef.current !== "listening") return;
      if (text.trim()) void think(text.trim());
      else setTimeout(listen, 200);
    };
    r.onerror = (e: any) => { if (e.error === "not-allowed") setP("muted"); };
    rec.current = r;
    window.speechSynthesis.getVoices();
    listen();
    return () => { alive.current = false; r.abort(); window.speechSynthesis.cancel(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = () => {
    if (phase === "muted") listen();
    else { setP("muted"); rec.current?.abort(); }
  };
  const interrupt = () => { window.speechSynthesis.cancel(); listen(); };
  const close = () => { alive.current = false; rec.current?.abort(); window.speechSynthesis.cancel(); onClose(turns.current); };

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
