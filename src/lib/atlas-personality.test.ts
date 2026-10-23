import { describe, expect, it } from "vitest";
import { PersonalitySchema, parsePersonality } from "./atlas-personality";
import { parseVoiceSettings, VoiceSettingsSchema } from "./voice-settings";

describe("Atlas company personality", () => {
  it("defaults existing companies to no additional instructions", () => {
    expect(parseVoiceSettings({ rate: 1.2 }).personality).toEqual({ instructions: "" });
  });
  it("preserves personality when voice settings are saved", () => {
    const settings = parseVoiceSettings({ personality: { instructions: "Priorize riscos comerciais." } });
    expect(VoiceSettingsSchema.parse({ ...settings, rate: 1.3 }).personality.instructions).toBe("Priorize riscos comerciais.");
  });
  it("rejects oversized company directives", () => {
    expect(PersonalitySchema.safeParse({ instructions: "a".repeat(2001) }).success).toBe(false);
    expect(PersonalitySchema.safeParse({ instructions: "a".repeat(2000) }).success).toBe(true);
  });
  it("falls back safely on invalid stored directives", () => {
    expect(parsePersonality({ instructions: 123 })).toEqual({ instructions: "" });
  });
});