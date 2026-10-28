import { describe, expect, it } from "vitest";
import * as crm from "@/lib/crm-data";

describe("dataset mode", () => {
  it("shows no demo deals while a connected company is loading or failed", () => {
    crm.setDataset("empty");
    expect(crm.DEALS.length).toBe(0);
  });
  it("uses demo deals only for a company without Bitrix24", () => {
    crm.setDataset(null);
    expect(crm.DEALS.length).toBeGreaterThan(0);
  });
});
