// Atlas procedural sound design (Web Audio API). Browser-only: call from handlers/effects.
const KEY = "sd-atlas-sound";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function soundEnabled() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(KEY) !== "off";
}
export function setSoundEnabled(on: boolean) { localStorage.setItem(KEY, on ? "on" : "off"); }

function ac() {
  if (typeof window === "undefined" || !soundEnabled()) return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain(); master.gain.value = 0.35;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 3200;
    master.connect(lp).connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type Tone = { f: number; to?: number; at?: number; dur: number; vol?: number; type?: OscillatorType; attack?: number };
function tone(c: AudioContext, { f, to, at = 0, dur, vol = 0.5, type = "sine", attack = 0.008 }: Tone) {
  const t = c.currentTime + at;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master!);
  o.start(t); o.stop(t + dur + 0.02);
}
function play(...tones: Tone[]) { const c = ac(); if (c) tones.forEach((x) => tone(c, x)); }

export const sfx = {
  dockIn: () => play({ f: 150, to: 320, dur: 0.18, vol: 0.5, attack: 0.03 }, { f: 640, dur: 0.12, at: 0.05, vol: 0.08 }),
  transmit: () => play({ f: 1800, to: 1200, dur: 0.035, vol: 0.18, type: "triangle", attack: 0.002 }, { f: 880, dur: 0.09, at: 0.02, vol: 0.12 }),
  action: () => play({ f: 587.33, dur: 0.12, vol: 0.3 }, { f: 880, dur: 0.18, at: 0.07, vol: 0.3 }),
  revert: () => play({ f: 880, dur: 0.12, vol: 0.22 }, { f: 587.33, dur: 0.18, at: 0.07, vol: 0.22 }),
  micOpen: () => play({ f: 660, to: 990, dur: 0.12, vol: 0.3, attack: 0.01 }),
  micClose: () => play({ f: 520, dur: 0.07, vol: 0.3, type: "triangle", attack: 0.002 }, { f: 1040, dur: 0.06, vol: 0.06 }),
  abort: () => play({ f: 400, to: 220, dur: 0.15, vol: 0.12, attack: 0.01 }),
  connect: () => play({ f: 523.25, dur: 0.45, vol: 0.2, attack: 0.03 }, { f: 659.25, dur: 0.45, at: 0.06, vol: 0.18, attack: 0.03 }, { f: 783.99, dur: 0.5, at: 0.12, vol: 0.16, attack: 0.03 }),
  thinking: () => play({ f: 740, dur: 0.22, vol: 0.06, attack: 0.02 }),
  speak: () => play({ f: 1046.5, dur: 0.04, vol: 0.08, attack: 0.004 }),
  bargeIn: () => play({ f: 1400, to: 900, dur: 0.03, vol: 0.1, type: "triangle", attack: 0.002 }),
  disconnect: () => play({ f: 659.25, to: 220, dur: 0.35, vol: 0.22, attack: 0.01 }),
};
