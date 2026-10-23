import { describe, expect, it } from "vitest";
import { canManageBitrix, normalizePortalDomain, isStateValid, canBindPortal } from "@/lib/bitrix-policy";

describe("Bitrix24 connection permissions", () => {
  it("allows a gestor to manage the connection", () => expect(canManageBitrix(false, "gestor")).toBe(true));
  it("prevents a colaborador from managing the connection", () => expect(canManageBitrix(false, "colaborador")).toBe(false));
  it("allows the global administrator to manage the connection", () => expect(canManageBitrix(true, null)).toBe(true));
  it("does not grant management without membership", () => expect(canManageBitrix(false, null)).toBe(false));
});

describe("Bitrix24 connection safety", () => {
  it("normalizes a portal URL", () => expect(normalizePortalDomain("https://Empresa.bitrix24.com.br/crm/")).toBe("empresa.bitrix24.com.br"));
  it("rejects an invalid portal", () => expect(normalizePortalDomain("javascript:alert(1)")).toBeNull());
  it("rejects a used state", () => expect(isStateValid(new Date(), new Date(), new Date())).toBe(false));
  it("rejects a state older than 15 minutes", () => expect(isStateValid(new Date(0), null, new Date(16 * 60 * 1000))).toBe(false));
  it("accepts a fresh state", () => expect(isStateValid(new Date(0), null, new Date(60_000))).toBe(true));
  it("blocks binding a portal already owned by another company", () => expect(canBindPortal("a", "b")).toBe(false));
  it("allows reconnecting the same company", () => expect(canBindPortal("a", "a")).toBe(true));
});
