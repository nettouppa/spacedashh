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
  const won = filterDeals({ ...f, period: "year" }).filter((d) => d.status === "won");
  const buckets: { label: string; value: number }[] = [];
  if (f.period === "month") {
    for (let w = 7; w >= 0; w--) {
      const end = NOW.getTime() - w * 7 * 864e5, start = end - 7 * 864e5;
      buckets.push({ label: `S-${w}`, value: won.filter((d) => d.closedAt!.getTime() > start && d.closedAt!.getTime() <= end).reduce((a, d) => a + d.value, 0) });
    }
    buckets[buckets.length - 1]!.label = "Atual";
  } else {
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    for (let m = 0; m <= NOW.getUTCMonth(); m++)
      buckets.push({ label: months[m]!, value: won.filter((d) => d.closedAt!.getUTCMonth() === m && d.closedAt!.getUTCFullYear() === NOW.getUTCFullYear()).reduce((a, d) => a + d.value, 0) });
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
  const start = periodStart(p);
  const d = new Date(start);
  if (p === "month") d.setUTCMonth(d.getUTCMonth() - 1);
  else if (p === "quarter") d.setUTCMonth(d.getUTCMonth() - 3);
  else d.setUTCFullYear(d.getUTCFullYear() - 1);
  // same elapsed length as current period, for fair comparison
  return { start: d, end: new Date(d.getTime() + (NOW.getTime() - start.getTime())) };
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
  activities?: { type: string; responsible_id: string | null; completed: boolean; created_at: string | null; deadline: string | null }[];
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

/** Swaps the module-level dataset every widget reads; pass null to go back to the demo data. */
export function setDataset(raw: RawDataset | null) {
  const d = raw ? toDataset(raw) : MOCK;
  PIPELINES = d.PIPELINES; NOW = d.NOW; DEALS = d.DEALS; SELLERS = d.SELLERS; COMPANIES = d.COMPANIES; TEAMS = d.TEAMS; LOSS_REASONS = d.LOSS_REASONS; ACTIVITIES = d.ACTIVITIES; TASKS = d.TASKS;
}

const workMatch = (f: Filters, x: { sellerId: string; team: string }, skip: (keyof Filters)[] = []) =>
  (skip.includes("team") || !f.team || x.team === f.team) && (skip.includes("sellerId") || !f.sellerId || x.sellerId === f.sellerId);

/** Activities created in the period, per seller and type (the seller filter is skipped so the table keeps everyone visible). */
export function productivity(f: Filters) {
  const start = periodStart(f.period);
  const acts = ACTIVITIES.filter((a) => a.createdAt >= start && workMatch(f, a, ["sellerId"]));
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
  const start = periodStart(f.period);
  const closed = tasks.filter((t) => t.done && t.closedAt && t.closedAt >= start && (!f.sellerId || t.sellerId === f.sellerId));
  const onTime = closed.filter((t) => !t.deadline || t.closedAt! <= t.deadline).length;
  const mine = (r: { id: string }) => !f.sellerId || r.id === f.sellerId;
  return {
    rows, open: rows.filter(mine).reduce((a, r) => a + r.open, 0), overdue: rows.filter(mine).reduce((a, r) => a + r.overdue, 0),
    lateActs: rows.filter(mine).reduce((a, r) => a + r.lateActs, 0), closed: closed.length, onTimeRate: closed.length ? onTime / closed.length : 0,
  };
}
