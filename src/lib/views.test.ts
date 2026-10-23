import { describe, expect, it } from "vitest";
import { loadViews } from "./views";

const ALL = ["funnel", "ranking", "pace", "loss", "activity", "tasks", "risk"];

describe("loadViews", () => {
  it("creates the 3 preset views when nothing is saved", () => {
    const r = loadViews(null, ALL);
    expect(r.views.map((v) => v.name)).toEqual(["Visão geral", "Comercial & Funil", "Operação & Produtividade"]);
    expect(r.active).toBe("geral");
  });
  it("keeps an old saved layout as the general view", () => {
    const r = loadViews({ order: ["risk", "funnel"], sizes: { risk: 4 } }, ALL);
    expect(r.views[0]!.order.slice(0, 2)).toEqual(["risk", "funnel"]);
    expect(r.views[0]!.sizes.risk).toBe(4);
  });
  it("restores the last opened view", () => {
    const r = loadViews({ views: [{ id: "a", name: "A", order: ["tasks"], sizes: {} }, { id: "b", name: "B", order: [], sizes: {} }], active: "b" }, ALL);
    expect(r.active).toBe("b");
  });
});
