import { describe, expect, it } from "vitest";
import { canManageBitrix, normalizePortalDomain, canBindPortal, parseWebhookUrl } from "@/lib/bitrix-policy";

describe("Bitrix24 connection permissions", () => {
  it("allows a gestor to manage the connection", () => expect(canManageBitrix(false, "gestor")).toBe(true));
  it("prevents a colaborador from managing the connection", () => expect(canManageBitrix(false, "colaborador")).toBe(false));
  it("allows the global administrator to manage the connection", () => expect(canManageBitrix(true, null)).toBe(true));
  it("does not grant management without membership", () => expect(canManageBitrix(false, null)).toBe(false));
});

describe("Bitrix24 connection safety", () => {
  it("normalizes a portal URL", () => expect(normalizePortalDomain("https://Empresa.bitrix24.com.br/crm/")).toBe("empresa.bitrix24.com.br"));
  it("rejects an invalid portal", () => expect(normalizePortalDomain("javascript:alert(1)")).toBeNull());
  it("blocks binding a portal already owned by another company", () => expect(canBindPortal("a", "b")).toBe(false));
  it("allows reconnecting the same company", () => expect(canBindPortal("a", "a")).toBe(true));
});

describe("Bitrix24 inbound webhook", () => {
  it("accepts a webhook URL", () => expect(parseWebhookUrl("https://Empresa.bitrix24.com.br/rest/1/abc123xyz/")).toEqual({ url: "https://empresa.bitrix24.com.br/rest/1/abc123xyz/", domain: "empresa.bitrix24.com.br", userId: "1" }));
  it("strips a method copied with the URL", () => expect(parseWebhookUrl("https://a.bitrix24.com/rest/7/abc123xyz/profile.json")?.url).toBe("https://a.bitrix24.com/rest/7/abc123xyz/"));
  it("rejects http", () => expect(parseWebhookUrl("http://a.bitrix24.com/rest/1/abc123xyz/")).toBeNull());
  it("rejects a URL without /rest/", () => expect(parseWebhookUrl("https://a.bitrix24.com/crm/deal/")).toBeNull());
  it("rejects a URL without key", () => expect(parseWebhookUrl("https://a.bitrix24.com/rest/1/")).toBeNull());
});
