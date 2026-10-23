import { describe, expect, it } from "vitest";
import { toDataset, type RawDataset } from "./crm-data";

const base = { title: "x", category_id: "1", opportunity: 100, assigned_by_id: "7", closed: false, date_create: "2026-01-01", close_date: null, date_modify: "2026-01-02" };
const raw: RawDataset = {
  domain: "a.bitrix24.com", lastSyncAt: null,
  stages: [
    { stage_id: "C1:NEW", category_id: "1", category_name: "Vendas", name: "Novo", sort: 10, semantics: null },
    { stage_id: "C1:WON", category_id: "1", category_name: "Vendas", name: "Ganho", sort: 90, semantics: "S" },
    { stage_id: "C1:LOSE", category_id: "1", category_name: "Vendas", name: "Sem orçamento", sort: 100, semantics: "F" },
  ],
  users: [{ user_id: "7", name: "Maria Silva", photo: null, department: "Inside" }],
  deals: [
    { ...base, deal_id: "1", stage_id: "C1:NEW" },
    { ...base, deal_id: "2", stage_id: "C1:WON", closed: true },
    { ...base, deal_id: "3", stage_id: "C1:LOSE", closed: true },
  ],
};

describe("toDataset", () => {
  const d = toDataset(raw, new Date("2026-02-01"));
  it("maps won stage to Ganho", () => expect(d.DEALS[1]).toMatchObject({ status: "won", stage: "Ganho" }));
  it("uses failed stage name as loss reason", () => expect(d.DEALS[2]).toMatchObject({ status: "lost", lossReason: "Sem orçamento" }));
  it("keeps the real Bitrix stage name", () => expect(d.DEALS[0]!.stage).toBe("Novo"));
  it("funnel steps follow the pipeline's real stages", () => expect(d.PIPELINES["Vendas"]).toEqual(["Novo", "Ganho"]));
  it("uses Bitrix user name and pipeline name", () => {
    expect(d.SELLERS[0]!.name).toBe("Maria Silva");
    expect(d.COMPANIES).toEqual(["Vendas"]);
  });
});
