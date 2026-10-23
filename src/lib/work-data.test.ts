import { describe, expect, it } from "vitest";
import { setDataset, taskHealth, productivity } from "./crm-data";

const base = { domain: "x", lastSyncAt: null, deals: [], stages: [],
  users: [{ user_id: "1", name: "Ana", photo: null, department: "Vendas" }] };

describe("tarefas e atividades", () => {
  it("conta tarefa atrasada só quando aberta e com prazo vencido", () => {
    setDataset({ ...base, deals: [{ deal_id: "d", title: null, stage_id: null, category_id: null, opportunity: 0, assigned_by_id: "1", closed: false, date_create: "2026-01-01", close_date: null, date_modify: null }],
      tasks: [
        { responsible_id: "1", status: "2", created_at: "2020-01-01", deadline: "2020-02-01", closed_at: null },
        { responsible_id: "1", status: "5", created_at: "2020-01-01", deadline: "2020-02-01", closed_at: "2020-01-15" },
        { responsible_id: "1", status: "3", created_at: "2020-01-01", deadline: "2999-01-01", closed_at: null },
      ] });
    const h = taskHealth({ period: "year" });
    expect(h.open).toBe(2);
    expect(h.overdue).toBe(1);
  });
  it("agrupa atividades por tipo", () => {
    const now = new Date().toISOString();
    setDataset({ ...base, deals: [{ deal_id: "d", title: null, stage_id: null, category_id: null, opportunity: 0, assigned_by_id: "1", closed: false, date_create: now, close_date: null, date_modify: null }],
      activities: [{ type: "call", responsible_id: "1", completed: true, created_at: now, deadline: null }, { type: "meeting", responsible_id: "1", completed: false, created_at: now, deadline: null }] });
    const p = productivity({ period: "month" });
    expect(p.by.call).toBe(1);
    expect(p.by.meeting).toBe(1);
    expect(p.total).toBe(2);
  });
});
