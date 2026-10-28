import { describe, expect, it } from "vitest";
import { cycleDays, toDataset, type Deal } from "./crm-data";

const d = (days: number): Deal => ({ id: "1", title: "", company: "", sellerId: "", team: "", stage: "", status: "won", value: 1, createdAt: new Date("2026-01-01"), closedAt: new Date(new Date("2026-01-01").getTime() + days * 864e5), lastActivityDays: 0 });

describe("insights", () => {
  it("ciclo médio = média de dias da criação ao ganho", () => {
    expect(cycleDays([d(10), d(20)])).toBe(15);
  });
  it("negócio aberto só tem próximo passo com atividade pendente vinculada a ele", () => {
    const now = new Date("2026-10-20T12:00:00Z");
    const base = { title: null, category_id: "0", opportunity: 100, assigned_by_id: "1", closed: false, date_create: "2026-10-01", close_date: null, date_modify: null, stage_id: "NEW" };
    const ds = toDataset({ domain: "x", lastSyncAt: null, users: [], stages: [{ stage_id: "NEW", category_id: "0", category_name: "Geral", name: "Novo", sort: 1, semantics: null }],
      deals: [{ ...base, deal_id: "10", source_name: "Site" }, { ...base, deal_id: "11" }],
      activities: [{ type: "call", responsible_id: "1", owner_type_id: "2", owner_id: "10", completed: false, created_at: "2026-10-19", deadline: "2026-10-25" },
        { type: "call", responsible_id: "1", owner_type_id: "2", owner_id: "11", completed: false, created_at: "2026-10-01", deadline: "2026-10-05" }] }, now);
    expect(ds.DEALS.find((x) => x.id === "10")!.hasNext).toBe(true);
    expect(ds.DEALS.find((x) => x.id === "11")!.hasNext).toBe(false);
    expect(ds.DEALS[0]!.source).toBe("Site");
  });
});
