import { describe, expect, it } from "vitest";
import { canManageAi, openAiErrorMessage, DEFAULT_OPENAI_MODEL, isLegacyModel, reasoningEffort } from "./ai-policy";

describe("Atlas OpenAI key", () => {
  it("managers and admins can configure the key", () => {
    expect(canManageAi(false, "gestor")).toBe(true);
    expect(canManageAi(true, null)).toBe(true);
  });
  it("collaborators and non-members cannot", () => {
    expect(canManageAi(false, "colaborador")).toBe(false);
    expect(canManageAi(false, null)).toBe(false);
  });
  it("quota errors are distinguished from rate limits", () => {
    expect(openAiErrorMessage(429, "insufficient_quota")).toContain("créditos");
    expect(openAiErrorMessage(429, null)).toContain("Muitas solicitações");
  });
  it("default model is GPT-6 Luna and old ids are flagged as legacy", () => {
    expect(DEFAULT_OPENAI_MODEL).toBe("gpt-6-luna");
    expect(isLegacyModel("gpt-4o-mini")).toBe(true);
    expect(isLegacyModel("gpt-6-luna")).toBe(false);
  });
  it("voice uses no reasoning on Luna, chat uses low", () => {
    expect(reasoningEffort("gpt-6-luna", true)).toBe("none");
    expect(reasoningEffort("gpt-6-luna", false)).toBe("low");
    expect(reasoningEffort("gpt-4.1-mini", true)).toBeNull();
  });
});

import { parseVoiceSettings, DEFAULT_VOICE } from "./voice-settings";
describe("voice settings", () => {
  it("invalid values fall back to defaults, valid ones are kept", () => {
    const v = parseVoiceSettings({ rate: 9, pitch: 1.2, length: "tiny", silenceMs: 100 });
    expect(v.rate).toBe(DEFAULT_VOICE.rate);
    expect(v.pitch).toBe(1.2);
    expect(v.length).toBe("tiny");
    expect(v.silenceMs).toBe(1000);
  });
});
