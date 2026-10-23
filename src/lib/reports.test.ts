import { describe, it, expect } from "vitest";
import { toCsv } from "./reports";

describe("toCsv", () => {
  it("uses ; and escapes quotes/separators", () => {
    expect(toCsv({ columns: ["A", "B"], rows: [["x;y", 'diz "oi"'], [1, 2]] })).toBe('A;B\n"x;y";"diz ""oi"""\n1;2');
  });
});
