import { canManageBitrix } from "@/lib/bitrix-policy";

export const OPENAI_MODELS = ["gpt-6-luna", "gpt-6.1-sol", "gpt-6-astra", "gpt-4.1-mini"] as const;
export type OpenAiModel = (typeof OPENAI_MODELS)[number];
export const DEFAULT_OPENAI_MODEL: OpenAiModel = "gpt-6-luna";
/** Older ids saved before the list was updated; still accepted when reading a company's config. */
export const LEGACY_MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-4.1", "gpt-4.1-mini"] as const;
export const MODEL_INFO: Record<OpenAiModel, { label: string; hint: string }> = {
  "gpt-6-luna": { label: "GPT-6 Luna", hint: "Rápido e barato · US$ 0,10 / 0,50 por 1M tokens" },
  "gpt-6.1-sol": { label: "GPT-6.1 Sol", hint: "Equilíbrio entre inteligência e custo · US$ 2 / 10" },
  "gpt-6-astra": { label: "GPT-6 Astra", hint: "O mais capaz, análises complexas · US$ 10 / 50" },
  "gpt-4.1-mini": { label: "GPT-4.1 mini (antigo)", hint: "Mantido para quem já usa" },
};
export function isLegacyModel(m: string | null | undefined): boolean {
  return !!m && (LEGACY_MODELS as readonly string[]).includes(m);
}
/** GPT-6 models are reasoning models: keep effort minimal for snappy answers. */
export function reasoningEffort(model: string, voice: boolean): "none" | "low" | null {
  if (!model.startsWith("gpt-6")) return null;
  if (voice && model === "gpt-6-luna") return "none";
  return "low";
}

/** Only global admins and company managers may set or remove the company's OpenAI key. */
export function canManageAi(isAdmin: boolean, role: "gestor" | "colaborador" | null): boolean {
  return canManageBitrix(isAdmin, role);
}

export const NO_KEY_REPLY = "A inteligência do Atlas ainda não foi configurada para esta empresa. Peça ao gestor para conectar a OpenAI em Integrações.";

/** Maps an OpenAI HTTP failure to a friendly Portuguese message. */
export function openAiErrorMessage(status: number, code?: string | null): string {
  if (status === 401) return "A chave da OpenAI desta empresa é inválida ou foi revogada. Peça ao gestor para atualizá-la em Integrações.";
  if (code === "insufficient_quota") return "A conta OpenAI desta empresa está sem créditos ou atingiu o limite de uso.";
  if (status === 429) return "Muitas solicitações à OpenAI. Tente novamente em instantes.";
  if (status === 404) return "O modelo escolhido não está disponível nesta conta OpenAI.";
  return `A OpenAI não respondeu agora (erro ${status}). Tente novamente.`;
}
