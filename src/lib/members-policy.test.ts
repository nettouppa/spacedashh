import { describe, expect, it } from "vitest";
import { canManageMembers, isPending } from "./members-policy";

describe("members policy", () => {
  it("gestor can manage members", () => expect(canManageMembers(false, "gestor")).toBe(true));
  it("admin can manage members", () => expect(canManageMembers(true, null)).toBe(true));
  it("colaborador cannot manage members", () => expect(canManageMembers(false, "colaborador")).toBe(false));
  it("non-member cannot manage members", () => expect(canManageMembers(false, null)).toBe(false));
  it("invite is pending until first sign-in", () => {
    expect(isPending(null)).toBe(true);
    expect(isPending("2026-10-01T00:00:00Z")).toBe(false);
  });
});
