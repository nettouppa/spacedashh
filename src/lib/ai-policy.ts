import { canManageBitrix } from "@/lib/bitrix-policy";

export const OPENAI_MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"] as const;
export type OpenAiModel = (typeof OPENAI_MODELS)[number];
export const DEFAULT_OPENAI_MODEL: OpenAiModel = "gpt-4o-mini";

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
