// Mock dataset simulating deals synced from Bitrix24 Cloud (crm.deal.list).
export let NOW = new Date("2026-10-22T12:00:00Z");

export const DEMO_STAGES = ["Prospecção", "Qualificação", "Proposta", "Negociação", "Ganho"];
/** Funnel steps in order (open stages + won). With Bitrix24 data they come from each pipeline's real stages. */
export let STAGES: string[] = [...DEMO_STAGES];
/** Bitrix24 pipeline name → ordered real stage names (open stages then won). Empty for demo data. */
export let PIPELINES: Record<string, string[]> = {};
export type Stage = string;
export let LOSS_REASONS: string[] = ["Preço", "Concorrência", "Sem orçamento", "Timing", "Sem resposta"];
export let COMPANIES: string[] = ["Violeta Matriz", "Violeta Sul", "Violeta Digital"];
export let TEAMS: string[] = ["Enterprise", "SMB", "Inside Sales"];

export type Seller = { id: string; name: string; team: string; photo: string; goal: number };
export let SELLERS: Seller[] = [
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

export let DEALS: Deal[] = (() => {
  const r = rng(42);
  const out: Deal[] = [];
  for (let i = 0; i < 420; i++) {
    const s = SELLERS[Math.floor(r() * SELLERS.length)]!;
    const daysAgo = Math.floor(r() * 365);
    const createdAt = new Date(NOW.getTime() - daysAgo * 864e5);
    const roll = r();
    const status: Deal["status"] = roll < 0.32 ? "won" : roll < 0.6 ? "lost" : "open";
    const base = s.team === "Enterprise" ? 38000 : s.team === "SMB" ? 16000 : 8000;
    const value = Math.round((base * (0.4 + r() * 1.8)) / 100) * 100;
    let stage: Stage = "Ganho";
    if (status !== "won") stage = STAGES[Math.floor(r() * 4)]!;
    const closedAt = status === "open" ? undefined : new Date(Math.min(NOW.getTime(), createdAt.getTime() + Math.floor(r() * 40) * 864e5));
    out.push({
      id: `D-${1000 + i}`, title: `${CLIENTS[i % CLIENTS.length]} · ${["Licenças", "Implantação", "Consultoria", "Renovação"][i % 4]}`,
      company: COMPANIES[Math.floor(r() * COMPANIES.length)]!, sellerId: s.id, team: s.team, stage, status, value,
      createdAt, closedAt, lossReason: status === "lost" ? LOSS_REASONS[Math.floor(r() * LOSS_REASONS.length)] : undefined,
      lastActivityDays: status === "open" ? Math.floor(r() * 30) : 0,
    });
  }
  return out;
})();

// ---------- Activities & tasks (crm.activity.list / tasks.task.list) ----------
export type ActivityType = "call" | "meeting" | "email" | "chat" | "task";
export const ACTIVITY_LABELS: Record<ActivityType, string> = { call: "Ligações", meeting: "Reuniões", email: "E-mails", chat: "Conversas", task: "Outras" };
export type Activity = { sellerId: string; team: string; type: ActivityType; completed: boolean; createdAt: Date; deadline?: Date | undefined };
export type Task = { sellerId: string; team: string; done: boolean; createdAt: Date; deadline?: Date | undefined; closedAt?: Date | undefined };

export let ACTIVITIES: Activity[] = (() => {
  const r = rng(7); const out: Activity[] = []; const types: ActivityType[] = ["call", "call", "call", "meeting", "email", "email", "chat", "task"];
  for (let i = 0; i < 1600; i++) {
    const s = SELLERS[Math.floor(r() * SELLERS.length)]!;
    const createdAt = new Date(NOW.getTime() - Math.floor(r() * 365) * 864e5);
    const deadline = new Date(createdAt.getTime() + Math.floor(r() * 10) * 864e5);
    out.push({ sellerId: s.id, team: s.team, type: types[Math.floor(r() * types.length)]!, completed: deadline < NOW ? r() < 0.85 : r() < 0.3, createdAt, deadline });
  }
  return out;
})();

export let TASKS: Task[] = (() => {
  const r = rng(99); const out: Task[] = [];
  for (let i = 0; i < 500; i++) {
    const s = SELLERS[Math.floor(r() * SELLERS.length)]!;
    const createdAt = new Date(NOW.getTime() - Math.floor(r() * 365) * 864e5);
    const deadline = new Date(createdAt.getTime() + Math.floor(3 + r() * 20) * 864e5);
    const done = deadline < NOW ? r() < 0.8 : r() < 0.25;
    out.push({ sellerId: s.id, team: s.team, done, createdAt, deadline, closedAt: done ? new Date(Math.min(NOW.getTime(), createdAt.getTime() + Math.floor(r() * 25) * 864e5)) : undefined });
  }
  return out;
})();

export type Preset = "week" | "month" | "quarter" | "semester" | "year";
export type DateRange = { preset?: Preset | undefined; from: Date; to: Date };
/** A preset (current calendar week/month/…) or an explicit inclusive date range. */
export type Period = Preset | DateRange;
export type Filters = {
  period: Period; company?: string | undefined; team?: string | undefined; sellerId?: string | undefined; stage?: Stage | undefined; lossReason?: string | undefined;
};

const DAY = 864e5;
/** Full calendar range of the current week (Mon–Sun), month, quarter, semester or year, relative to NOW. */
export function presetRange(p: Preset): DateRange {
  const y = NOW.getUTCFullYear(), m = NOW.getUTCMonth();
  if (p === "week") {
    const from = new Date(Date.UTC(y, m, NOW.getUTCDate() - ((NOW.getUTCDay() + 6) % 7)));
    return { preset: p, from, to: new Date(from.getTime() + 7 * DAY - 1) };
  }
  const len = p === "month" ? 1 : p === "quarter" ? 3 : p === "semester" ? 6 : 12;
  const sm = Math.floor(m / len) * len;
  return { preset: p, from: new Date(Date.UTC(y, sm, 1)), to: new Date(Date.UTC(y, sm + len, 1) - 1) };
}
export const range = (p: Period): DateRange => (typeof p === "string" ? presetRange(p) : p);
export const presetOf = (p: Period) => range(p).preset;
const fmt = (d: Date, year = true) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}${year ? `/${d.getUTCFullYear()}` : ""}`;
export const PRESET_LABELS: Record<Preset, string> = { week: "Semana", month: "Mês", quarter: "Trimestre", semester: "Semestre", year: "Ano" };
export function periodLabel(p: Period, short = false) {
  const r = range(p);
  if (short && r.preset) return PRESET_LABELS[r.preset];
  const sameYear = r.from.getUTCFullYear() === r.to.getUTCFullYear();
  return `${fmt(r.from, !short || !sameYear)} – ${fmt(r.to, !short || !sameYear)}`;
}
/** Whether the closing pace is shown per week (ranges up to ~2 months) instead of per month. */
export const paceWeekly = (p: Period) => { const r = range(p); return r.to.getTime() - r.from.getTime() <= 62 * DAY; };

export function periodStart(p: Period) { return range(p).from; }
export function periodEnd(p: Period) { return range(p).to; }

/** Apply all filters except the ones listed in `skip` (so a widget can keep showing its own siblings). */
export function filterDeals(f: Filters, skip: (keyof Filters)[] = []) {
  const { from: start, to: end } = range(f.period);
  return DEALS.filter((d) => {
    const ref = d.closedAt ?? d.createdAt;
    if (d.status !== "open" && (ref < start || ref > end)) return false;
    if (!skip.includes("company") && f.company && d.company !== f.company) return false;
    if (!skip.includes("team") && f.team && d.team !== f.team) return false;
    if (!skip.includes("sellerId") && f.sellerId && d.sellerId !== f.sellerId) return false;
    if (!skip.includes("stage") && f.stage && d.stage !== f.stage) return false;
    if (!skip.includes("lossReason") && f.lossReason && d.lossReason !== f.lossReason) return false;
    return true;
  });
}

/** Goals set by managers: "YYYY-MM" → sellerId → monthly revenue goal. */
export let GOALS: Record<string, Record<string, number>> = {};
export function setGoals(rows: { month: string; seller_ref: string; amount: number }[]) {
  const g: Record<string, Record<string, number>> = {};
  rows.forEach((r) => { const k = r.month.slice(0, 7); (g[k] ??= {})[r.seller_ref] = Number(r.amount) || 0; });
  GOALS = g;
}
export const monthKey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
/** Suggested monthly goal when none was set (historical projection). */
export const suggestedGoal = (s: Seller) => Math.round(s.goal * 0.35);
export const hasCustomGoal = (sellerId: string, month: string) => GOALS[month]?.[sellerId] !== undefined;
export function monthlyGoal(s: Seller, month: string) {
  return GOALS[month]?.[s.id] ?? suggestedGoal(s);
}
/** Months covered by the period (whole month/quarter/year). */
/** Months touched by the period with the fraction of each month's days covered. */
export function periodMonthShares(p: Period) {
  const { from, to } = range(p);
  const out: { month: string; share: number }[] = [];
  for (let c = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1)); c <= to; c = new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth() + 1, 1))) {
    const next = Date.UTC(c.getUTCFullYear(), c.getUTCMonth() + 1, 1);
    const days = (next - c.getTime()) / DAY;
    const covered = (Math.min(next, to.getTime() + 1) - Math.max(c.getTime(), from.getTime())) / DAY;
    out.push({ month: monthKey(c), share: Math.min(1, Math.max(0, Math.round(covered) / days)) });
  }
  return out;
}
export function periodMonths(p: Period) { return periodMonthShares(p).map((x) => x.month); }
/** Goal for the period; partial months are prorated by days. */
export function sellerGoal(s: Seller, p: Period) {
  return periodMonthShares(p).reduce((a, x) => a + monthlyGoal(s, x.month) * x.share, 0);
}

export function goalFor(f: Filters) {
  const sellers = SELLERS.filter((s) => (!f.team || s.team === f.team) && (!f.sellerId || s.id === f.sellerId));
  const companyFactor = f.company ? 1 / COMPANIES.length : 1;
  return sellers.reduce((a, s) => a + sellerGoal(s, f.period), 0) * companyFactor;
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

/** Pipeline the funnel shows: the selected one, else the pipeline with the most deals in the current filters. */
export function funnelPipeline(f: Filters): string | undefined {
  if (!Object.keys(PIPELINES).length) return undefined;
  if (f.company && PIPELINES[f.company]) return f.company;
  const count = new Map<string, number>();
  filterDeals(f, ["stage"]).forEach((d) => { if (PIPELINES[d.company]) count.set(d.company, (count.get(d.company) ?? 0) + 1); });
  return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? Object.keys(PIPELINES)[0];
}

export function funnel(f: Filters) {
  const pipe = funnelPipeline(f);
  const steps = pipe ? PIPELINES[pipe]! : STAGES;
  const deals = filterDeals(f, ["stage"]).filter((d) => !pipe || d.company === pipe);
  // Lost deals sit on a failure stage outside the steps: they count as entries at the top only.
  const idx = (s: Stage) => Math.max(0, steps.indexOf(s));
  return steps.map((stage, i) => {
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
  const r = range(f.period);
  const won = filterDeals({ ...f, period: { from: new Date(0), to: NOW } }).filter((d) => d.status === "won");
  const last = Math.min(r.to.getTime(), NOW.getTime());
  const buckets: { label: string; value: number }[] = [];
  if (paceWeekly(f.period)) {
    for (let w = 7; w >= 0; w--) {
      const end = last - w * 7 * DAY, start = end - 7 * DAY;
      buckets.push({ label: `S-${w}`, value: won.filter((d) => d.closedAt!.getTime() > start && d.closedAt!.getTime() <= end).reduce((a, d) => a + d.value, 0) });
    }
    buckets[buckets.length - 1]!.label = last >= NOW.getTime() - DAY ? "Atual" : "S-0";
  } else {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const end = new Date(last);
    const multiYear = r.from.getUTCFullYear() !== end.getUTCFullYear();
    for (let c = new Date(Date.UTC(r.from.getUTCFullYear(), r.from.getUTCMonth(), 1)); c <= end; c = new Date(Date.UTC(c.getUTCFullYear(), c.getUTCMonth() + 1, 1))) {
      const y = c.getUTCFullYear(), m = c.getUTCMonth();
      buckets.push({ label: `${months[m]!}${multiYear ? `/${String(y).slice(2)}` : ""}`, value: won.filter((d) => d.closedAt!.getUTCMonth() === m && d.closedAt!.getUTCFullYear() === y).reduce((a, d) => a + d.value, 0) });
    }
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

export function periodPrevRange(p: Period) {
  const r = range(p);
  const d = new Date(r.from);
  if (r.preset === "week") d.setUTCDate(d.getUTCDate() - 7);
  else if (r.preset) d.setUTCMonth(d.getUTCMonth() - { month: 1, quarter: 3, semester: 6, year: 12 }[r.preset]);
  else d.setTime(r.from.getTime() - (r.to.getTime() - r.from.getTime()) - 1);
  // same elapsed length as current period, for fair comparison
  const elapsed = Math.min(r.to.getTime(), NOW.getTime()) - r.from.getTime();
  return { start: d, end: new Date(d.getTime() + Math.max(elapsed, 0)) };
}

/** KPIs for the equivalent elapsed window of the previous period. */
export function previousKpis(f: Filters) {
  const { start, end } = periodPrevRange(f.period);
  const deals = DEALS.filter((d) => {
    if (d.status === "open" || !d.closedAt || d.closedAt < start || d.closedAt > end) return false;
    if (f.company && d.company !== f.company) return false;
    if (f.team && d.team !== f.team) return false;
    if (f.sellerId && d.sellerId !== f.sellerId) return false;
    if (f.stage && d.stage !== f.stage) return false;
    if (f.lossReason && d.lossReason !== f.lossReason) return false;
    return true;
  });
  const won = deals.filter((d) => d.status === "won");
  const lost = deals.filter((d) => d.status === "lost");
  const revenue = won.reduce((a, d) => a + d.value, 0);
  const openCount = DEALS.filter((d) => d.status === "open" && d.createdAt <= end && (!f.sellerId || d.sellerId === f.sellerId) && (!f.team || d.team === f.team)).length;
  return { revenue, ticket: won.length ? revenue / won.length : 0, conversion: won.length + lost.length ? won.length / (won.length + lost.length) : 0, openCount };
}

// ---------- Real Bitrix24 dataset ----------
export type RawDataset = {
  domain: string; lastSyncAt: string | null;
  deals: { deal_id: string; title: string | null; stage_id: string | null; category_id: string | null; opportunity: number; assigned_by_id: string | null; closed: boolean; date_create: string | null; close_date: string | null; date_modify: string | null }[];
  users: { user_id: string; name: string; photo: string | null; department: string | null }[];
  stages: { stage_id: string; category_id: string | null; category_name: string | null; name: string; sort: number; semantics: string | null }[];
  activities?: { type: string; responsible_id: string | null; completed: boolean; created_at: string | null; deadline: string | null; provider?: string | null; channel?: string | null; start_time?: string | null; end_time?: string | null }[];
  tasks?: { responsible_id: string | null; status: string | null; created_at: string | null; deadline: string | null; closed_at: string | null }[];
};

const MOCK = { PIPELINES: {} as Record<string, string[]>, NOW, DEALS, SELLERS, COMPANIES, TEAMS, LOSS_REASONS, ACTIVITIES, TASKS };
const avatar = (name: string) => `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=ede9fe&textColor=5b21b6`;

/** Maps Bitrix24 rows onto the dashboard model: open stages are spread across the 4 open funnel steps by their order in each pipeline; S = won, F = lost (stage name becomes the loss reason). */
export function toDataset(raw: RawDataset, now = new Date()) {
  const byStage = new Map(raw.stages.map((s) => [s.stage_id, s]));
  const openByCat = new Map<string, string[]>();
  raw.stages.filter((s) => !["S", "F", "success", "failure", "apology"].includes(s.semantics ?? "") && !/(^|:)(WON|LOSE|APOLOGY)$/.test(s.stage_id)).sort((a, b) => a.sort - b.sort)
    .forEach((s) => { const k = s.category_id ?? "0"; openByCat.set(k, [...(openByCat.get(k) ?? []), s.stage_id]); });
  const catName = new Map(raw.stages.map((s) => [s.category_id ?? "0", s.category_name ?? "Funil"]));
  const users = new Map(raw.users.map((u) => [u.user_id, u]));
  const pipelines = new Map<string, { open: string[]; won: string }>();
  [...new Set(raw.stages.map((s) => s.category_id ?? "0"))].forEach((cat) => {
    const ws = raw.stages.filter((s) => (s.category_id ?? "0") === cat && (s.semantics === "S" || s.semantics === "success" || s.stage_id.endsWith(":WON") || s.stage_id === "WON"));
    pipelines.set(cat, { open: (openByCat.get(cat) ?? []).map((id) => byStage.get(id)!.name), won: ws[0]?.name ?? "Ganho" });
  });
  const deals: Deal[] = raw.deals.map((d) => {
    const st = d.stage_id ? byStage.get(d.stage_id) : undefined;
    const code = d.stage_id?.split(":").pop() ?? "";
    const won = st?.semantics === "S" || st?.semantics === "success" || code === "WON";
    const lost = st?.semantics === "F" || st?.semantics === "failure" || st?.semantics === "apology" || code === "LOSE" || code === "APOLOGY" || (d.closed && !won);
    const cat = d.category_id ?? "0";
    const list = openByCat.get(cat) ?? [];
    const wonName = pipelines.get(cat)?.won ?? "Ganho";
    const stage: Stage = won ? wonName : lost ? (st?.name ?? "Perdido") : (st?.name ?? list.map((id) => byStage.get(id)?.name)[0] ?? "Sem etapa");
    const createdAt = new Date(d.date_create ?? now);
    const closedAt = won || lost ? new Date(d.close_date ?? d.date_modify ?? d.date_create ?? now) : undefined;
    const sellerId = d.assigned_by_id ?? "0";
    return {
      id: d.deal_id, title: d.title ?? `Negócio ${d.deal_id}`, company: catName.get(cat) ?? (cat === "0" ? "Funil geral" : `Funil ${cat}`),
      sellerId, team: users.get(sellerId)?.department ?? "Sem equipe", stage, status: won ? "won" : lost ? "lost" : "open",
      value: Number(d.opportunity) || 0, createdAt, closedAt,
      lossReason: lost ? (st?.name ?? "Não informado") : undefined,
      lastActivityDays: Math.max(0, Math.floor((now.getTime() - new Date(d.date_modify ?? d.date_create ?? now).getTime()) / 864e5)),
    };
  });
  const sellerIds = [...new Set(deals.map((d) => d.sellerId))];
  const yearAgo = now.getTime() - 365 * 864e5;
  const sellers: Seller[] = sellerIds.map((id) => {
    const u = users.get(id);
    const name = u?.name ?? `Usuário ${id}`;
    const wonYear = deals.filter((d) => d.sellerId === id && d.status === "won" && d.closedAt!.getTime() >= yearAgo).reduce((a, d) => a + d.value, 0);
    // No goals in Bitrix24 yet: monthly goal = 10% above the trailing 12-month monthly average (÷0.35 compensates goalFor's factor).
    return { id, name, team: u?.department ?? "Sem equipe", photo: u?.photo || avatar(name), goal: Math.round(((wonYear / 12) * 1.1) / 0.35) };
  });
  const uniq = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const pipeByName: Record<string, string[]> = {};
  pipelines.forEach((p, cat) => { if (deals.some((d) => d.company === (catName.get(cat) ?? ""))) pipeByName[catName.get(cat)!] = [...p.open, p.won]; });
  const teamOf = (id: string) => users.get(id)?.department ?? "Sem equipe";
  const activities: Activity[] = (raw.activities ?? []).map((a) => {
    const sid = a.responsible_id ?? "0";
    return { sellerId: sid, team: teamOf(sid), type: (["call", "meeting", "email", "chat"].includes(a.type) ? a.type : "task") as ActivityType, completed: a.completed, createdAt: new Date(a.created_at ?? now), deadline: a.deadline ? new Date(a.deadline) : undefined };
  });
  const tasks: Task[] = (raw.tasks ?? []).map((t) => {
    const sid = t.responsible_id ?? "0";
    return { sellerId: sid, team: teamOf(sid), done: t.status === "5" || t.status === "4", createdAt: new Date(t.created_at ?? now), deadline: t.deadline ? new Date(t.deadline) : undefined, closedAt: t.closed_at ? new Date(t.closed_at) : undefined };
  });
  return { ACTIVITIES: activities, TASKS: tasks, PIPELINES: pipeByName, NOW: now, DEALS: deals, SELLERS: sellers, COMPANIES: uniq(deals.map((d) => d.company)), TEAMS: uniq(sellers.map((s) => s.team)), LOSS_REASONS: uniq(deals.filter((d) => d.lossReason).map((d) => d.lossReason!)) };
}

const EMPTY_RAW: RawDataset = { domain: "", lastSyncAt: null, deals: [], users: [], stages: [], activities: [], tasks: [] };

/** Swaps the module-level dataset every widget reads. null = demo data (company without Bitrix24); "empty" = loading/error, never show demo numbers. */
export function setDataset(input: RawDataset | null | "empty") {
  const raw = input === "empty" ? EMPTY_RAW : input;
  const d = raw ? toDataset(raw) : MOCK;
  PIPELINES = d.PIPELINES; NOW = d.NOW; DEALS = d.DEALS; SELLERS = d.SELLERS; COMPANIES = d.COMPANIES; TEAMS = d.TEAMS; LOSS_REASONS = d.LOSS_REASONS; ACTIVITIES = d.ACTIVITIES; TASKS = d.TASKS;
  CONVERSATIONS = raw ? toConversations(raw.activities ?? [], d.SELLERS, d.NOW) : MOCK_CONVERSATIONS;
}

// ---------- Atendimento (Canais Abertos: sessões IMOPENLINES registradas no CRM) ----------
export type Conversation = { sellerId: string; team: string; channel: string; createdAt: Date; closedAt?: Date | undefined; firstResponseMin?: number | undefined };

/** Channel name from an open-line activity subject / provider type. */
export function channelOf(text: string | null | undefined): string {
  const t = (text ?? "").toLowerCase();
  if (t.includes("whatsapp") || t.includes("wz_")) return "WhatsApp";
  if (t.includes("instagram")) return "Instagram";
  if (t.includes("telegram")) return "Telegram";
  if (t.includes("facebook") || t.includes("messenger")) return "Facebook";
  if (t.includes("livechat") || t.includes("chat do site") || t.includes("site") || t.includes("widget")) return "Chat do site";
  if (t.includes("e-mail") || t.includes("email")) return "E-mail";
  return "Outros";
}

const MOCK_CONVERSATIONS: Conversation[] = (() => {
  const r = rng(23); const out: Conversation[] = [];
  const ch = ["WhatsApp", "WhatsApp", "WhatsApp", "WhatsApp", "Instagram", "Instagram", "Chat do site", "Chat do site", "Telegram", "Facebook"];
  for (let i = 0; i < 1400; i++) {
    const s = SELLERS[Math.floor(r() * SELLERS.length)]!;
    const createdAt = new Date(NOW.getTime() - Math.floor(r() * 365 * 24) * 36e5);
    const open = NOW.getTime() - createdAt.getTime() < 2 * 864e5 && r() < 0.5;
    out.push({ sellerId: s.id, team: s.team, channel: ch[Math.floor(r() * ch.length)]!, createdAt, firstResponseMin: Math.round(1 + r() * r() * 40),
      closedAt: open ? undefined : new Date(createdAt.getTime() + Math.round(10 + r() * r() * 600) * 6e4) });
  }
  return out;
})();
export let CONVERSATIONS: Conversation[] = MOCK_CONVERSATIONS;

export function toConversations(acts: NonNullable<RawDataset["activities"]>, sellers: Seller[], now: Date): Conversation[] {
  const team = new Map(sellers.map((s) => [s.id, s.team]));
  return acts.filter((a) => (a.provider ?? "").toUpperCase().includes("IMOPENLINES")).map((a) => {
    const sid = a.responsible_id ?? "0";
    const createdAt = new Date(a.start_time ?? a.created_at ?? now);
    return { sellerId: sid, team: team.get(sid) ?? "Sem equipe", channel: a.channel ?? "Outros", createdAt,
      closedAt: a.completed ? new Date(a.end_time ?? a.deadline ?? a.created_at ?? now) : undefined };
  });
}

/** Conversation volume, resolution and handling time in the period (agent filter skipped in the ranking). */
export function support(f: Filters) {
  const start = periodStart(f.period), end = periodEnd(f.period);
  const all = CONVERSATIONS.filter((c) => c.createdAt >= start && c.createdAt <= end && workMatch(f, c, ["sellerId"]));
  const mine = all.filter((c) => !f.sellerId || c.sellerId === f.sellerId);
  const closed = mine.filter((c) => c.closedAt);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const handle = (cs: Conversation[]) => avg(cs.filter((c) => c.closedAt).map((c) => Math.max(0, (c.closedAt!.getTime() - c.createdAt.getTime()) / 6e4)));
  const counts = new Map<string, number>();
  mine.forEach((c) => counts.set(c.channel, (counts.get(c.channel) ?? 0) + 1));
  const byChannel = [...counts.entries()].map(([channel, count]) => ({ channel, count, share: mine.length ? count / mine.length : 0 })).sort((a, b) => b.count - a.count);
  const rows = SELLERS.map((s) => {
    const cs = all.filter((c) => c.sellerId === s.id);
    return { id: s.id, name: s.name, photo: s.photo, count: cs.length, open: cs.filter((c) => !c.closedAt).length, avgHandle: handle(cs) };
  }).filter((r) => r.count > 0).sort((a, b) => b.count - a.count);
  return {
    total: mine.length, open: mine.length - closed.length, resolutionRate: mine.length ? closed.length / mine.length : 0,
    avgHandleMin: handle(mine), avgFirstMin: avg(mine.filter((c) => c.firstResponseMin !== undefined).map((c) => c.firstResponseMin!)), byChannel, rows,
  };
}

export const duration = (min: number | null) => {
  if (min === null) return "—";
  if (min < 60) return `${Math.round(min)} min`;
  if (min < 1440) return `${(Math.round((min / 60) * 10) / 10).toString().replace(".", ",")} h`;
  return `${(Math.round((min / 1440) * 10) / 10).toString().replace(".", ",")} d`;
};

// ---------- Evolução ----------
const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const dealMatch = (f: Filters, d: Deal) => (!f.company || d.company === f.company) && (!f.team || d.team === f.team) && (!f.sellerId || d.sellerId === f.sellerId);
function goalForMonth(f: Filters, month: string) {
  const sellers = SELLERS.filter((s) => (!f.team || s.team === f.team) && (!f.sellerId || s.id === f.sellerId));
  return sellers.reduce((a, s) => a + monthlyGoal(s, month), 0) * (f.company ? 1 / COMPANIES.length : 1);
}

/** Last 6 months won revenue vs goal, plus the current month's cumulative daily curve, ideal pace and run-rate projection. */
export function evolution(f: Filters) {
  const won = DEALS.filter((d) => d.status === "won" && d.closedAt && dealMatch(f, d));
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth() - 5 + i, 1));
    const key = monthKey(d);
    const revenue = won.filter((x) => monthKey(x.closedAt!) === key).reduce((a, x) => a + x.value, 0);
    return { key, label: MONTHS_PT[d.getUTCMonth()]!, revenue, goal: goalForMonth(f, key) };
  });
  const cur = months[5]!, prev = months[4]!;
  const daysInMonth = new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth() + 1, 0)).getUTCDate();
  const today = NOW.getUTCDate();
  let acc = 0;
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    if (day <= today) acc += won.filter((x) => monthKey(x.closedAt!) === cur.key && x.closedAt!.getUTCDate() === day).reduce((a, x) => a + x.value, 0);
    return { day, actual: day <= today ? acc : null, ideal: (cur.goal * day) / daysInMonth };
  });
  // previous month, same elapsed days
  const prevSameDay = won.filter((x) => monthKey(x.closedAt!) === prev.key && x.closedAt!.getUTCDate() <= today).reduce((a, x) => a + x.value, 0);
  const projection = today ? (cur.revenue / today) * daysInMonth : 0;
  return { months, days, today, daysInMonth, current: cur.revenue, goal: cur.goal, projection, prevSameDay, projectionPct: cur.goal ? projection / cur.goal : 0 };
}

const workMatch = (f: Filters, x: { sellerId: string; team: string }, skip: (keyof Filters)[] = []) =>
  (skip.includes("team") || !f.team || x.team === f.team) && (skip.includes("sellerId") || !f.sellerId || x.sellerId === f.sellerId);

/** Activities created in the period, per seller and type (the seller filter is skipped so the table keeps everyone visible). */
export function productivity(f: Filters) {
  const start = periodStart(f.period), end = periodEnd(f.period);
  const acts = ACTIVITIES.filter((a) => a.createdAt >= start && a.createdAt <= end && workMatch(f, a, ["sellerId"]));
  const won = filterDeals(f, ["sellerId"]).filter((d) => d.status === "won");
  const rows = SELLERS.filter((s) => !f.team || s.team === f.team).map((s) => {
    const mine = acts.filter((a) => a.sellerId === s.id);
    const by = { call: 0, meeting: 0, email: 0, chat: 0, task: 0 } as Record<ActivityType, number>;
    mine.forEach((a) => { by[a.type]++; });
    const wins = won.filter((d) => d.sellerId === s.id).length;
    return { id: s.id, name: s.name, photo: s.photo, total: mine.length, done: mine.filter((a) => a.completed).length, by, wins, perWin: wins ? mine.length / wins : 0 };
  }).filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
  const by = { call: 0, meeting: 0, email: 0, chat: 0, task: 0 } as Record<ActivityType, number>;
  rows.forEach((r) => (Object.keys(by) as ActivityType[]).forEach((k) => { by[k] += r.by[k]; }));
  return { rows, by, total: rows.reduce((a, r) => a + r.total, 0) };
}

/** Open tasks (any creation date) and tasks/activities overdue right now, per seller. */
export function taskHealth(f: Filters) {
  const now = NOW.getTime();
  const tasks = TASKS.filter((t) => workMatch(f, t, ["sellerId"]));
  const acts = ACTIVITIES.filter((a) => !a.completed && workMatch(f, a, ["sellerId"]));
  const rows = SELLERS.filter((s) => !f.team || s.team === f.team).map((s) => {
    const open = tasks.filter((t) => t.sellerId === s.id && !t.done);
    const overdue = open.filter((t) => t.deadline && t.deadline.getTime() < now).length;
    const lateActs = acts.filter((a) => a.sellerId === s.id && a.deadline && a.deadline.getTime() < now).length;
    return { id: s.id, name: s.name, photo: s.photo, open: open.length, overdue, lateActs };
  }).filter((r) => r.open + r.lateActs > 0).sort((a, b) => b.overdue + b.lateActs - (a.overdue + a.lateActs));
  const start = periodStart(f.period), end = periodEnd(f.period);
  const closed = tasks.filter((t) => t.done && t.closedAt && t.closedAt >= start && t.closedAt <= end && (!f.sellerId || t.sellerId === f.sellerId));
  const onTime = closed.filter((t) => !t.deadline || t.closedAt! <= t.deadline).length;
  const mine = (r: { id: string }) => !f.sellerId || r.id === f.sellerId;
  return {
    rows, open: rows.filter(mine).reduce((a, r) => a + r.open, 0), overdue: rows.filter(mine).reduce((a, r) => a + r.overdue, 0),
    lateActs: rows.filter(mine).reduce((a, r) => a + r.lateActs, 0), closed: closed.length, onTimeRate: closed.length ? onTime / closed.length : 0,
  };
}
