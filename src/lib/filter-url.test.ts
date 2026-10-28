import { describe, expect, it } from "vitest";
import { filtersFromSearch, searchFromFilters, decodePeriod } from "./filter-url";

describe("filtros no endereço", () => {
  it("ida e volta mantém os mesmos filtros", () => {
    const s = searchFromFilters({ period: "quarter", team: "Sul", sellerId: "42", stage: "Proposta" });
    expect(s).toEqual({ p: "quarter", eq: "Sul", seller: "42", st: "Proposta" });
    const f = filtersFromSearch(s);
    expect(f.period).toBe("quarter");
    expect(f.sellerId).toBe("42");
  });
  it("intervalo de datas personalizado vira from_to", () => {
    const s = searchFromFilters({ period: { from: new Date("2026-01-05T00:00:00Z"), to: new Date("2026-02-10T23:59:59Z") } });
    expect(s.p).toBe("2026-01-05_2026-02-10");
  });
  it("período inválido volta para o mês", () => {
    expect(decodePeriod("lixo")).toBe("month");
    expect(decodePeriod("2026-03-01_2026-01-01")).toBe("month");
  });
});
