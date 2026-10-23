/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getVoiceSettings, speakWithOpenAi } from "@/lib/ai-settings.functions";
import { DEFAULT_VOICE, type VoiceSettings } from "@/lib/voice-settings";
import { Mic, MicOff, Square, X } from "lucide-react";
import { type AiAction } from "@/lib/ai.functions";
import { supabase } from "@/integrations/supabase/client";
import { takeSentences } from "@/lib/sentences";
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
    try { rec.current.start(); } catch { /* já ativo */ }
  }

  const gen = useRef(0);
  function stopSpeech() {
    gen.current++;
    window.speechSynthesis.cancel();
    if (audio.current) { audio.current.pause(); audio.current = null; }
  }

  function afterSpeech() { if (alive.current && phaseRef.current === "speaking") listen(); }

  function startBargeIn() {
    if (!vs.current.bargeIn || !rec.current) return;
    try { rec.current.start(); } catch { /* já ativo */ }
  }

  const cleanText = (t: string) => t.replace(/[*_#`>|]/g, "");

  function playBrowser(text: string, g: number) {
    return new Promise<void>((done) => {
      if (g !== gen.current) return done();
      const synth = window.speechSynthesis;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "pt-BR"; u.rate = vs.current.rate; u.pitch = vs.current.pitch;
      const voices = synth.getVoices();
      const v = (vs.current.voiceName && voices.find((x) => x.name === vs.current.voiceName))
        ?? voices.find((x) => x.lang.toLowerCase().startsWith("pt-br")) ?? voices.find((x) => x.lang.toLowerCase().startsWith("pt"));
      if (v) u.voice = v;
      u.onend = () => done(); u.onerror = () => done();
      synth.speak(u);
    });
  }

  function playAudio(b64: string, g: number) {
    return new Promise<void>((done) => {
      if (g !== gen.current) return done();
      const a = new Audio(`data:audio/mpeg;base64,${b64}`);
      a.playbackRate = vs.current.rate;
      a.onended = () => done(); a.onerror = () => done();
      audio.current = a;
      a.play().catch(() => done());
    });
  }

  /** Speaks sentences as they arrive: audio for the next sentence is fetched while the current one plays. */
  function makeSpeaker(g: number) {
    let chain = Promise.resolve();
    let started = false;
    const useOpenAi = vs.current.tts === "openai";
    return {
      push(sentence: string) {
        const text = cleanText(sentence).trim();
        if (!text) return;
        const audioP = useOpenAi ? tts({ data: { companyId, text: text.slice(0, 2000) } }).then((r) => r.audio).catch(() => null) : Promise.resolve(null);
        chain = chain.then(async () => {
          if (g !== gen.current || !alive.current) return;
          const b64 = await audioP;
          if (g !== gen.current || !alive.current) return;
          if (!started) { started = true; setP("speaking"); startBargeIn(); }
          if (b64) await playAudio(b64, g); else await playBrowser(text, g);
        });
      },
      finish() { chain = chain.then(() => { if (g === gen.current) afterSpeech(); }); },
    };
  }

  async function speak(text: string) {
    stopSpeech();
    setSaid(text);
    const sp = makeSpeaker(gen.current);
    sp.push(text); sp.finish();
  }

  async function think(text: string) {
    setP("thinking");
    stopSpeech();
    const g = gen.current;
    turns.current.push({ role: "user", content: text });
    const t0 = performance.now();
    try {
      const msgs = [...history, ...turns.current].slice(-20);
      const { data: s } = await supabase.auth.getSession();
      const res = await fetch("/api/atlas-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.session?.access_token ?? ""}` },
        body: JSON.stringify({ messages: msgs, context: context(), companyId }),
      });
      if (!res.ok || !res.body) throw new Error(String(res.status));
      const sp = makeSpeaker(g);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let raw = "", full = "", pending = "", first = true;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        if (g !== gen.current || !alive.current) { void reader.cancel(); return; }
        raw += dec.decode(value, { stream: true });
        const lines = raw.split("\n"); raw = lines.pop() ?? "";
        for (const l of lines) {
          if (!l.trim()) continue;
          const ev = JSON.parse(l) as { t: string; v?: any };
          if (ev.t === "text") {
            full += ev.v; pending += ev.v; setSaid(full);
            const { done: ready, rest } = takeSentences(pending);
            pending = rest;
            for (const r of ready) { if (first) { first = false; console.debug("[atlas] 1ª frase em", Math.round(performance.now() - t0), "ms"); } sp.push(r); }
          } else if (ev.t === "action" && ev.v) onAction(ev.v as AiAction);
        }
      }
      if (pending.trim()) sp.push(pending);
      turns.current.push({ role: "assistant", content: full || "Pronto." });
      if (!full) sp.push("Pronto.");
      sp.finish();
    } catch {
      if (alive.current && g === gen.current) void speak("Não consegui responder agora. Tente novamente.");
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
      if (phaseRef.current === "speaking") {
        if (text.trim().length < 4) return;
        stopSpeech(); setP("listening");
      }
      setHeard(text);
      if (silence.current) clearTimeout(silence.current);
      silence.current = setTimeout(() => { try { r.stop(); } catch { /* */ } }, vs.current.silenceMs);
    };
    r.onend = () => {
      if (silence.current) clearTimeout(silence.current);
      if (!alive.current || phaseRef.current !== "listening") return;
      if (text.trim()) void think(text.trim());
      else setTimeout(listen, 200);
    };
    r.onerror = (e: any) => { if (e.error === "not-allowed") setP("muted"); };
    rec.current = r;
    window.speechSynthesis.getVoices();
    listen();
    return () => { alive.current = false; r.abort(); stopSpeech(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMute = () => {
    if (phase === "muted") listen();
    else { setP("muted"); rec.current?.abort(); }
  };
  const interrupt = () => { stopSpeech(); rec.current?.abort(); setP("listening"); setTimeout(listen, 150); };
  const close = () => { alive.current = false; rec.current?.abort(); stopSpeech(); onClose(turns.current); };

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
