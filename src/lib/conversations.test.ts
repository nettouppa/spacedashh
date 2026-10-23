import { describe, it, expect } from "vitest";
import { titleFrom, groupConversations } from "./conversations";

describe("conversations", () => {
  it("cuts long titles near 60 chars", () => {
    const t = titleFrom("Quais negócios em risco devo priorizar hoje considerando a equipe Enterprise e o funil Geral?");
    expect(t.length).toBeLessThanOrEqual(61);
    expect(t.endsWith("…")).toBe(true);
    expect(titleFrom("  Resumo do mês ")).toBe("Resumo do mês");
  });
  it("groups pinned first, then by date", () => {
    const now = new Date(2026, 9, 23, 12);
    const g = groupConversations([
      { id: "a", pinned: false, updated_at: new Date(2026, 9, 23, 9).toISOString() },
      { id: "b", pinned: false, updated_at: new Date(2026, 9, 22, 9).toISOString() },
      { id: "c", pinned: true, updated_at: new Date(2026, 0, 1).toISOString() },
      { id: "d", pinned: false, updated_at: new Date(2026, 9, 18).toISOString() },
      { id: "e", pinned: false, updated_at: new Date(2026, 5, 1).toISOString() },
    ], now);
    expect(g.map((x) => x.group)).toEqual(["Fixadas", "Hoje", "Ontem", "Últimos 7 dias", "Mais antigas"]);
  });
});

import { highlights, followUps } from "./conversations";
describe("reply helpers", () => {
  it("extracts numeric bold highlights only", () => {
    expect(highlights("Receita **R$ 120 mil** e **38%** da meta, **atenção**")).toEqual(["R$ 120 mil", "38%"]);
  });
  it("suggests up to 3 follow-ups", () => {
    expect(followUps("A meta está em 38%")[0]).toBe("O que preciso para bater a meta?");
    expect(followUps("ok").length).toBe(3);
  });
});
