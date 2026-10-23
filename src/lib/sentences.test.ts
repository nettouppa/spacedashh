import { describe, it, expect } from "vitest";
import { takeSentences } from "./sentences";

describe("takeSentences", () => {
  it("releases finished sentences and keeps the tail", () => {
    const r = takeSentences("A receita do mês foi boa. Agora vamos ver o fun");
    expect(r.done).toEqual(["A receita do mês foi boa."]);
    expect(r.rest).toBe(" Agora vamos ver o fun");
  });
  it("does not split decimal numbers", () => {
    const r = takeSentences("Você fechou R$ 1.500 em vendas hoje. E");
    expect(r.done).toEqual(["Você fechou R$ 1.500 em vendas hoje."]);
  });
  it("waits when the punctuation is the last character", () => {
    expect(takeSentences("A meta está em 72%.").done).toEqual([]);
  });
});
