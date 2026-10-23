import { z } from "zod";
import { OPENAI_MODELS } from "@/lib/ai-policy";
import { PersonalitySchema } from "@/lib/atlas-personality";

export const OPENAI_VOICES = ["alloy", "ash", "coral", "echo", "sage", "shimmer", "verse", "ballad"] as const;
export const RESPONSE_LENGTHS = { tiny: "Curtíssima (1 frase)", short: "Curta (até 3 frases)", detailed: "Detalhada" } as const;

export const VoiceSettingsSchema = z.object({
  personality: PersonalitySchema.default({ instructions: "" }),
  voiceName: z.string().max(200).nullable().default(null),
  rate: z.number().min(0.7).max(1.5).default(1.05),
  pitch: z.number().min(0.5).max(1.5).default(1),
  length: z.enum(["tiny", "short", "detailed"]).default("short"),
  silenceMs: z.number().int().min(600).max(3000).default(700),
  bargeIn: z.boolean().default(true),
  voiceModel: z.enum(OPENAI_MODELS).nullable().default(null),
  tts: z.enum(["browser", "openai"]).default("browser"),
  openaiVoice: z.enum(OPENAI_VOICES).default("coral"),
});
export type VoiceSettings = z.infer<typeof VoiceSettingsSchema>;
export const DEFAULT_VOICE: VoiceSettings = VoiceSettingsSchema.parse({});

/** Reads stored settings tolerantly: unknown or invalid fields fall back to defaults. */
export function parseVoiceSettings(raw: unknown): VoiceSettings {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(DEFAULT_VOICE) as (keyof VoiceSettings)[]) {
    const r = VoiceSettingsSchema.shape[k].safeParse(src[k]);
    out[k] = r.success ? r.data : DEFAULT_VOICE[k];
  }
  return out as VoiceSettings;
}

export function voiceStyle(length: VoiceSettings["length"]): string {
  const n = length === "tiny" ? "em UMA frase curta" : length === "short" ? "em 1 a 3 frases curtas" : "em até 6 frases, com mais detalhe";
  return `Você está numa conversa por VOZ: responda ${n} e naturais, sem markdown, sem listas, sem tabelas, sem emojis. Escreva valores por extenso de forma falável (ex: 230 mil reais).`;
}
