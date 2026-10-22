import { describe, expect, it } from "vitest";
import { canManageBitrix, bitrixSetupUnavailable } from "@/lib/bitrix-policy";

describe("Bitrix24 connection permissions", () => {
  it("allows a gestor to manage the connection", () => expect(canManageBitrix(false, "gestor")).toBe(true));
  it("prevents a colaborador from managing the connection", () => expect(canManageBitrix(false, "colaborador")).toBe(false));
  it("allows the global administrator to manage the connection", () => expect(canManageBitrix(true, null)).toBe(true));
  it("does not grant management without membership", () => expect(canManageBitrix(false, null)).toBe(false));
  it("rejects installations until secure authorization is configured", () => expect(bitrixSetupUnavailable().status).toBe(503));
});