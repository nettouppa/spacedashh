import { describe, expect, it } from "vitest";
import { NOW, SELLERS, periodPrevRange, presetRange, sellerGoal, setGoals } from "./crm-data";

const ymd = (d: Date) => d.toISOString().slice(0, 10);

describe("period presets (NOW = 2026-10-22, quinta)", () => {
  it("week runs Monday to Sunday", () => {
    expect(NOW.toISOString().slice(0, 10)).toBe("2026-10-22");
    const r = presetRange("week");
    expect([ymd(r.from), ymd(r.to)]).toEqual(["2026-10-19", "2026-10-25"]);
  });
  it("month, quarter, semester and year cover the whole calendar period", () => {
    expect([ymd(presetRange("month").from), ymd(presetRange("month").to)]).toEqual(["2026-10-01", "2026-10-31"]);
    expect([ymd(presetRange("quarter").from), ymd(presetRange("quarter").to)]).toEqual(["2026-10-01", "2026-12-31"]);
    expect([ymd(presetRange("semester").from), ymd(presetRange("semester").to)]).toEqual(["2026-07-01", "2026-12-31"]);
    expect([ymd(presetRange("year").from), ymd(presetRange("year").to)]).toEqual(["2026-01-01", "2026-12-31"]);
  });
  it("previous semester starts six months earlier", () => {
    expect(ymd(periodPrevRange("semester").start)).toBe("2026-01-01");
  });
});

describe("goal proration", () => {
  it("a partial month counts the goal proportionally to the days", () => {
    const s = SELLERS[0]!;
    setGoals([{ month: "2026-10-01", seller_ref: s.id, amount: 31000 }]);
    const tenDays = { from: new Date("2026-10-01T00:00:00Z"), to: new Date("2026-10-10T23:59:59.999Z") };
    expect(Math.round(sellerGoal(s, tenDays))).toBe(10000);
    expect(sellerGoal(s, "month")).toBe(31000);
    setGoals([]);
  });
});
