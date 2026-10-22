// Mock dataset simulating deals synced from Bitrix24 Cloud (crm.deal.list).
export const NOW = new Date("2026-10-22T12:00:00Z");

export const STAGES = ["Prospecção", "Qualificação", "Proposta", "Negociação", "Ganho"] as const;
export type Stage = (typeof STAGES)[number];
export const LOSS_REASONS = ["Preço", "Concorrência", "Sem orçamento", "Timing", "Sem resposta"] as const;
export const COMPANIES = ["Violeta Matriz", "Violeta Sul", "Violeta Digital"] as const;
export const TEAMS = ["Enterprise", "SMB", "Inside Sales"] as const;

export type Seller = { id: string; name: string; team: string; photo: string; goal: number };
export const SELLERS: Seller[] = [
  { id: "s1", name: "Ana Ribeiro", team: "Enterprise", photo: "https://i.pravatar.cc/150?img=47", goal: 260000 },
  { id: "s2", name: "Bruno Costa", team: "Enterprise", photo: "https://i.pravatar.cc/150?img=12", goal: 240000 },
  { id: "s3", name: "Carla Mendes", team: "SMB", photo: "https://i.pravatar.cc/150?img=45", goal: 160000 },
  { id: "s4", name: "Diego Alves", team: "SMB", photo: "https://i.pravatar.cc/150?img=33", goal: 150000 },
  { id: "s5", name: "Elisa Nunes", team: "Inside Sales", photo: "https://i.pravatar.cc/150?img=32", goal: 110000 },
  { id: "s6", name: "Felipe Rocha", team: "Inside Sales", photo: "https://i.pravatar.cc/150?img=15", goal: 100000 },
  { id: "s7", name: "Gabriela Lima", team: "SMB", photo: "https://i.pravatar.cc/150?img=44", goal: 140000 },
];

export type Deal = {
  id: string; title: string; company: string; sellerId: string; team: string;
  stage: Stage; status: "open" | "won" | "lost"; value: number;
  createdAt: Date; closedAt?: Date | undefined; lossReason?: string | undefined; lastActivityDays: number;
};

function rng(seed: number) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}
const CLIENTS = ["Acme", "Orion", "Nexa", "Lumen", "Vértice", "Atlas", "Pulsar", "Íris", "Quantum", "Boreal", "Zênite", "Ômega"];

export const DEALS: Deal[] = (() => {
  const r = rng(42);
  const out: Deal[] = [];
  for (let i = 0; i < 420; i++) {
    const s = SELLERS[Math.floor(r() * SELLERS.length)];
    const daysAgo = Math.floor(r() * 365);
    const createdAt = new Date(NOW.getTime() - daysAgo * 864e5);
    const roll = r();
    const status: Deal["status"] = roll < 0.32 ? "won" : roll < 0.6 ? "lost" : "open";
    const base = s.team === "Enterprise" ? 38000 : s.team === "SMB" ? 16000 : 8000;
    const value = Math.round((base * (0.4 + r() * 1.8)) / 100) * 100;
    let stage: Stage = "Ganho";
    if (status !== "won") stage = STAGES[Math.floor(r() * 4)];
    const closedAt = status === "open" ? undefined : new Date(Math.min(NOW.getTime(), createdAt.getTime() + Math.floor(r() * 40) * 864e5));
    out.push({
      id: `D-${1000 + i}`, title: `${CLIENTS[i % CLIENTS.length]} · ${["Licenças", "Implantação", "Consultoria", "Renovação"][i % 4]}`,
      company: COMPANIES[Math.floor(r() * COMPANIES.length)], sellerId: s.id, team: s.team, stage, status, value,
      createdAt, closedAt, lossReason: status === "lost" ? LOSS_REASONS[Math.floor(r() * LOSS_REASONS.length)] : undefined,
      lastActivityDays: status === "open" ? Math.floor(r() * 30) : 0,
    });
  }
  return out;
})();

export type Period = "month" | "quarter" | "year";
export type Filters = {
  period: Period; company?: string | undefined; team?: string | undefined; sellerId?: string | undefined; stage?: Stage | undefined; lossReason?: string | undefined;
};

export function periodStart(p: Period) {
  const d = new Date(NOW);
  if (p === "month") return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  if (p === "quarter") return new Date(Date.UTC(d.getUTCFullYear(), Math.floor(d.getUTCMonth() / 3) * 3, 1));
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}

/** Apply all filters except the ones listed in `skip` (so a widget can keep showing its own siblings). */
export function filterDeals(f: Filters, skip: (keyof Filters)[] = []) {
  const start = periodStart(f.period);
  return DEALS.filter((d) => {
    const ref = d.closedAt ?? d.createdAt;
    if (d.status !== "open" && ref < start) return false;
    if (!skip.includes("company") && f.company && d.company !== f.company) return false;
    if (!skip.includes("team") && f.team && d.team !== f.team) return false;
    if (!skip.includes("sellerId") && f.sellerId && d.sellerId !== f.sellerId) return false;
    if (!skip.includes("stage") && f.stage && d.stage !== f.stage) return false;
    if (!skip.includes("lossReason") && f.lossReason && d.lossReason !== f.lossReason) return false;
    return true;
  });
}

export function goalFor(f: Filters) {
  const mult = f.period === "month" ? 1 : f.period === "quarter" ? 3 : 12;
  const sellers = SELLERS.filter((s) => (!f.team || s.team === f.team) && (!f.sellerId || s.id === f.sellerId));
  const companyFactor = f.company ? 1 / COMPANIES.length : 1;
  return sellers.reduce((a, s) => a + s.goal, 0) * mult * companyFactor * 0.35;
}

export function kpis(f: Filters) {
  const deals = filterDeals(f);
  const won = deals.filter((d) => d.status === "won");
  const lost = deals.filter((d) => d.status === "lost");
  const open = deals.filter((d) => d.status === "open");
  const revenue = won.reduce((a, d) => a + d.value, 0);
  const goal = goalFor(f);
  return {
    revenue, goal, goalPct: goal ? revenue / goal : 0,
    ticket: won.length ? revenue / won.length : 0,
    openCount: open.length, openValue: open.reduce((a, d) => a + d.value, 0),
    conversion: won.length + lost.length ? won.length / (won.length + lost.length) : 0,
    wonCount: won.length,
  };
}

export function funnel(f: Filters) {
  const deals = filterDeals(f, ["stage"]).filter((d) => d.status !== "lost" || true);
  const idx = (s: Stage) => STAGES.indexOf(s);
  return STAGES.map((stage, i) => {
    // deals that reached at least this stage
    const reached = deals.filter((d) => idx(d.stage) >= i);
    const prev = i === 0 ? reached.length : deals.filter((d) => idx(d.stage) >= i - 1).length;
    return { stage, count: reached.length, value: reached.reduce((a, d) => a + d.value, 0), pass: prev ? reached.length / prev : 0 };
  });
}

export function ranking(f: Filters) {
  const deals = filterDeals(f, ["sellerId"]).filter((d) => d.status === "won");
  return SELLERS.filter((s) => !f.team || s.team === f.team)
    .map((s) => ({ ...s, total: deals.filter((d) => d.sellerId === s.id).reduce((a, d) => a + d.value, 0) }))
    .sort((a, b) => b.total - a.total);
}

export function atRisk(f: Filters) {
  return filterDeals(f).filter((d) => d.status === "open" && d.lastActivityDays >= 10 && d.value >= 20000)
    .sort((a, b) => b.value - a.value);
}

export function lossReasons(f: Filters) {
  const deals = filterDeals(f, ["lossReason"]).filter((d) => d.status === "lost");
  return LOSS_REASONS.map((reason) => {
    const l = deals.filter((d) => d.lossReason === reason);
    return { reason, count: l.length, value: l.reduce((a, d) => a + d.value, 0) };
  }).sort((a, b) => b.count - a.count);
}

export function pace(f: Filters) {
  const won = filterDeals({ ...f, period: "year" }).filter((d) => d.status === "won");
  const buckets: { label: string; value: number }[] = [];
  if (f.period === "month") {
    for (let w = 7; w >= 0; w--) {
      const end = NOW.getTime() - w * 7 * 864e5, start = end - 7 * 864e5;
      buckets.push({ label: `S-${w}`, value: won.filter((d) => d.closedAt!.getTime() > start && d.closedAt!.getTime() <= end).reduce((a, d) => a + d.value, 0) });
    }
    buckets[buckets.length - 1].label = "Atual";
  } else {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    for (let m = 0; m <= NOW.getUTCMonth(); m++)
      buckets.push({ label: months[m], value: won.filter((d) => d.closedAt!.getUTCMonth() === m && d.closedAt!.getUTCFullYear() === NOW.getUTCFullYear()).reduce((a, d) => a + d.value, 0) });
  }
  return buckets;
}

// Manual formatting: Intl output differs between server and browser runtimes (hydration mismatch).
export const brl = (n: number, compact = true) => {
  const sep = (x: number) => Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (!compact || Math.abs(n) < 1000) return `R$ ${sep(n)}`;
  const [v, u] = Math.abs(n) >= 1e6 ? [n / 1e6, "mi"] : [n / 1e3, "mil"];
  return `R$ ${(Math.round(v * 10) / 10).toString().replace(".", ",")} ${u}`;
};
export const pct = (n: number) => `${Math.round(n * 100)}%`;
export const sellerName = (id?: string) => SELLERS.find((s) => s.id === id)?.name;
