import { describe, expect, it } from "vitest";
import { canManageAi, openAiErrorMessage } from "./ai-policy";

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
});
