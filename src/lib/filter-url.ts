import type { Filters, Period, Preset } from "./crm-data";

export type FilterSearch = { p?: string; fn?: string; eq?: string; seller?: string; st?: string; lr?: string };

const PRESETS: Preset[] = ["week", "month", "quarter", "semester", "year"];
const day = (d: Date) => d.toISOString().slice(0, 10);
const str = (v: unknown, n = 80) => (typeof v === "string" && v ? v.slice(0, n) : undefined);

export function encodePeriod(p: Period): string {
  if (typeof p === "string") return p;
  return p.preset ? p.preset : `${day(p.from)}_${day(p.to)}`;
}

export function decodePeriod(s?: string): Period {
  if (!s) return "month";
  if ((PRESETS as string[]).includes(s)) return s as Preset;
  const m = /^(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/.exec(s);
  if (!m) return "month";
  const from = new Date(`${m[1]}T00:00:00Z`), to = new Date(`${m[2]}T23:59:59.999Z`);
  return Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to ? "month" : { from, to };
}

export function parseFilterSearch(s: Record<string, unknown>): FilterSearch {
  const out: FilterSearch = {};
  const keys = ["p", "fn", "eq", "seller", "st", "lr"] as const;
  for (const k of keys) { const v = str(s[k]); if (v) out[k] = v; }
  return out;
}

export function filtersFromSearch(s: FilterSearch): Filters {
  return { period: decodePeriod(s.p), company: s.fn, team: s.eq, sellerId: s.seller, stage: s.st, lossReason: s.lr };
}

export function searchFromFilters(f: Filters): FilterSearch {
  const out: FilterSearch = {};
  const p = encodePeriod(f.period);
  if (p !== "month") out.p = p;
  if (f.company) out.fn = f.company;
  if (f.team) out.eq = f.team;
  if (f.sellerId) out.seller = f.sellerId;
  if (f.stage) out.st = f.stage;
  if (f.lossReason) out.lr = f.lossReason;
  return out;
}
