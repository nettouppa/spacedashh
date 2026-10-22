import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  atRisk, brl, funnel, goalFor, kpis, lossReasons, pace, pct, previousKpis, ranking, sellerName, type Filters, type Stage,
} from "@/lib/crm-data";

export type SetFilter = (patch: Partial<Filters>) => void;
type P = { f: Filters; set: SetFilter; big?: boolean | undefined };

export function Card({ className, children, title, subtitle, right }: { className?: string; children: React.ReactNode; title?: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <section className={cn("flex h-full flex-col rounded-xl border border-border bg-card text-card-foreground shadow-soft", className)}>
      {title && (
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div><h3 className="text-sm font-semibold">{title}</h3>{subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}</div>
          {right ?? <MoreHorizontal className="size-4 text-subtle-foreground" />}
        </header>
      )}
      <div className="flex-1 p-5">{children}</div>
    </section>
  );
}

function Delta({ cur, prev, invert = false }: { cur: number; prev: number; invert?: boolean }) {
  if (!prev) return <span className="text-xs text-subtle-foreground">sem base</span>;
  const d = (cur - prev) / prev;
  const good = invert ? d < 0 : d >= 0;
  const Icon = d >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums", good ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>
      <Icon className="size-3" />{Math.abs(Math.round(d * 100))}%
    </span>
  );
}

function Spark({ data, className }: { data: number[]; className?: string }) {
  const max = Math.max(...data, 1), w = 100, h = 32;
  const pts = data.map((v, i) => [(i / Math.max(data.length - 1, 1)) * w, h - (v / max) * (h - 4) - 2] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cn("h-8 w-full text-primary", className)}>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill="currentColor" opacity="0.08" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function KpiStrip({ f, big }: P) {
  const k = kpis(f), p = previousKpis(f);
  const trend = pace(f).map((d) => d.value);
  const num = cn("font-semibold tracking-tight tabular-nums", big ? "text-6xl" : "text-[28px] leading-9");
  const items = [
    { label: "Receita realizada", value: brl(k.revenue), delta: <Delta cur={k.revenue} prev={p.revenue} />, foot: (
      <div className="mt-3">
        <div className="flex justify-between text-xs text-muted-foreground"><span>{pct(k.goalPct)} da meta</span><span>{brl(k.goal)}</span></div>
        <div className="mt-1.5 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.min(k.goalPct, 1) * 100}%` }} /></div>
      </div>) },
    { label: "Ticket médio", value: brl(k.ticket), delta: <Delta cur={k.ticket} prev={p.ticket} />, foot: <Spark data={trend} className="mt-3" /> },
    { label: "Negócios abertos", value: String(k.openCount), delta: <span className="text-xs text-muted-foreground">{brl(k.openValue)}</span>, foot: <Spark data={trend.map((_, i) => k.openCount * (0.8 + ((i * 37) % 9) / 30))} className="mt-3" /> },
    { label: "Taxa de conversão", value: pct(k.conversion), delta: <Delta cur={k.conversion} prev={p.conversion} />, foot: <Spark data={trend.map((v) => v * (0.6 + k.conversion))} className="mt-3" /> },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((it) => (
        <section key={it.label} className="rounded-xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between"><span className={cn("text-[13px] font-medium text-muted-foreground", big && "text-lg")}>{it.label}</span>{it.delta}</div>
          <div className={cn("mt-2", num)}>{it.value}</div>
          {it.foot}
        </section>
      ))}
    </div>
  );
}

// Pass-rate color thresholds between funnel stages.
export const PASS_THRESHOLDS = { good: 0.6, warn: 0.4 } as const;
const passTone = (r: number) =>
  r >= PASS_THRESHOLDS.good ? "bg-success-soft text-success" : r >= PASS_THRESHOLDS.warn ? "bg-warning-soft text-warning" : "bg-danger-soft text-danger";

export function FunnelWidget({ f, set, big }: P) {
  const data = funnel(f);
  const [metric, setMetric] = useState<"count" | "value">("count");
  const val = (s: (typeof data)[number]) => (metric === "count" ? s.count : s.value);
  const top = (data[0] && val(data[0])) || 1;
  // Strictly proportional widths (no minimum) — labels live above each band.
  const widths = data.map((s) => (val(s) / top) * 100);
  const last = data[data.length - 1];
  const overall = data[0]?.count ? (last?.count ?? 0) / data[0].count : 0;
  let gap = { i: 1, pass: 1 };
  data.forEach((s, i) => { if (i && s.pass < gap.pass) gap = { i, pass: s.pass }; });
  const n = Math.max(data.length - 1, 1);
  return (
    <Card title="Funil de vendas" subtitle="Clique numa etapa para filtrar o painel"
      right={
        <div className="inline-flex rounded-md border border-border bg-muted/60 p-0.5 text-xs font-medium">
          {(["count", "value"] as const).map((m) => (
            <button key={m} onClick={() => setMetric(m)} className={cn("rounded px-2.5 py-1 transition-colors", metric === m ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground")}>
              {m === "count" ? "Quantidade" : "Valor"}
            </button>
          ))}
        </div>
      }>
      <div className="mb-6 grid grid-cols-3 divide-x divide-border rounded-lg border border-border">
        <div className="p-4"><div className="text-xs font-medium text-muted-foreground">Eficiência topo → fundo</div><div className={cn("mt-1 font-semibold tabular-nums text-primary", big ? "text-5xl" : "text-3xl")}>{(overall * 100).toFixed(1).replace(".", ",")}%</div><div className="mt-0.5 text-xs text-muted-foreground">{last?.count ?? 0} ganhos de {data[0]?.count ?? 0} entradas</div></div>
        <div className="p-4"><div className="text-xs font-medium text-muted-foreground">Valor convertido</div><div className={cn("mt-1 font-semibold tabular-nums", big ? "text-5xl" : "text-3xl")}>{brl(last?.value ?? 0)}</div><div className="mt-0.5 text-xs text-muted-foreground">de {brl(data[0]?.value ?? 0)} no topo</div></div>
        <div className="p-4"><div className="text-xs font-medium text-muted-foreground">Maior gargalo</div><div className={cn("mt-1 font-semibold", big ? "text-2xl" : "text-base")}>{data[gap.i - 1]?.stage} → {data[gap.i]?.stage}</div><span className={cn("mt-1 inline-block rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums", passTone(gap.pass))}>{pct(gap.pass)} de passagem</span></div>
      </div>
      <div className="mx-auto max-w-3xl">
        {data.map((s, i) => {
          const w = widths[i]!;
          const next = widths[i + 1] ?? w * 0.85;
          const inset = w ? Math.max(0, ((w - next) / 2 / w) * 100) : 0;
          const active = f.stage === s.stage;
          const ticket = s.count ? s.value / s.count : 0;
          return (
            <div key={s.stage}>
              {i > 0 && (
                <div className="flex justify-center py-1.5">
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-semibold tabular-nums", big ? "text-sm" : "text-[11px]", passTone(s.pass))}>↓ {pct(s.pass)} conversão</span>
                </div>
              )}
              <button onClick={() => set({ stage: active ? undefined : (s.stage as Stage) })}
                title={`Ticket médio ${brl(ticket)} · ${pct(s.count / (data[0]?.count || 1))} do topo`}
                className={cn("group block w-full text-center transition-opacity", f.stage && !active && "opacity-40")}>
                <div className={cn("mb-1.5 flex items-baseline justify-center gap-2", big ? "text-xl" : "text-sm")}>
                  <span className="font-semibold text-foreground">{s.stage}</span>
                  <span className="text-subtle-foreground">·</span>
                  <span className="font-semibold tabular-nums">{s.count}</span><span className="text-muted-foreground">negócios</span>
                  <span className="text-subtle-foreground">·</span>
                  <span className="font-semibold tabular-nums text-primary">{brl(s.value)}</span>
                </div>
                <div className={cn("mx-auto transition-all group-hover:brightness-110", big ? "h-12" : "h-9")}
                  style={{
                    width: `${w}%`, minWidth: s.count ? 2 : 0,
                    background: `color-mix(in oklab, var(--primary) ${28 + (i / n) * 72}%, var(--card))`,
                    clipPath: w ? `polygon(0 0, 100% 0, ${100 - inset}% 100%, ${inset}% 100%)` : undefined,
                    outline: active ? "2px solid var(--primary)" : undefined, outlineOffset: 3,
                  }} />
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}


export function RankingWidget({ f, set, big }: P) {
  const data = ranking(f);
  return (
    <Card title="Ranking de executivos" subtitle="Receita ganha e % da meta individual">
      <ul className="-my-1 divide-y divide-border">
        {data.map((s, i) => {
          const active = f.sellerId === s.id;
          const goal = goalFor({ period: f.period, sellerId: s.id, company: f.company });
          const g = goal ? s.total / goal : 0;
          return (
            <li key={s.id}>
              <button onClick={() => set({ sellerId: active ? undefined : s.id })}
                className={cn("-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/60", active && "bg-primary-soft", f.sellerId && !active && "opacity-40")}>
                <span className="w-4 text-xs tabular-nums text-subtle-foreground">{i + 1}</span>
                <img src={s.photo} alt={s.name} className={cn("rounded-full object-cover", big ? "size-12" : "size-8")} loading="lazy" />
                <div className="min-w-0 flex-1">
                  <div className={cn("truncate text-sm font-medium", big && "text-lg")}>{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.team}</div>
                </div>
                <div className="w-24 text-right">
                  <div className={cn("text-sm font-semibold tabular-nums", big && "text-lg")}>{brl(s.total)}</div>
                  <div className="mt-1 flex items-center gap-1.5"><div className="h-1 flex-1 rounded-full bg-muted"><div className="h-1 rounded-full bg-primary" style={{ width: `${Math.min(g, 1) * 100}%` }} /></div><span className="text-[11px] tabular-nums text-muted-foreground">{pct(g)}</span></div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function RiskWidget({ f, big }: P) {
  const data = atRisk(f);
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <Card title="Negócios em risco" subtitle="≥ R$ 20 mil, sem atividade há 10+ dias"
      right={<span className="rounded-md bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">{data.length} · {brl(total)}</span>}>
      <div className="-mx-5 -my-5 max-h-[22rem] overflow-auto">
        <table className={cn("w-full text-sm", big && "text-base")}>
          <thead className="sticky top-0 bg-card"><tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-5 py-2.5 font-medium">Negócio</th><th className="py-2.5 font-medium">Inativo</th><th className="px-5 py-2.5 text-right font-medium">Valor</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {data.slice(0, big ? 6 : 12).map((d) => (
              <tr key={d.id}>
                <td className="px-5 py-2.5"><div className="font-medium">{d.title}</div><div className="text-xs text-muted-foreground">{sellerName(d.sellerId)} · {d.stage}</div></td>
                <td className="py-2.5"><span className="inline-flex items-center gap-1.5 text-xs tabular-nums"><span className={cn("size-1.5 rounded-full", d.lastActivityDays >= 20 ? "bg-danger" : "bg-warning")} />{d.lastActivityDays}d</span></td>
                <td className="px-5 py-2.5 text-right font-semibold tabular-nums">{brl(d.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.length && <p className="py-10 text-center text-sm text-muted-foreground">Nenhum negócio crítico</p>}
      </div>
    </Card>
  );
}

export function LossWidget({ f, set, big }: P) {
  const data = lossReasons(f);
  const total = data.reduce((a, d) => a + d.count, 0) || 1;
  return (
    <Card title="Motivos de perda" subtitle={`${data.reduce((a, d) => a + d.count, 0)} negócios perdidos`}>
      <div className="space-y-1">
        {data.map((d) => {
          const active = f.lossReason === d.reason;
          return (
            <button key={d.reason} onClick={() => set({ lossReason: active ? undefined : d.reason })}
              className={cn("-mx-2 w-[calc(100%+1rem)] rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60", active && "bg-primary-soft", f.lossReason && !active && "opacity-40")}>
              <div className={cn("flex items-baseline justify-between text-sm", big && "text-base")}>
                <span className="font-medium">{d.reason}</span>
                <span className="tabular-nums"><span className="font-semibold">{pct(d.count / total)}</span><span className="ml-2 text-xs text-muted-foreground">{d.count} · {brl(d.value)}</span></span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary/70" style={{ width: `${(d.count / total) * 100}%` }} /></div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

export function PaceWidget({ f, big }: P) {
  const data = pace(f);
  const target = goalFor(f) / Math.max(data.length, 1);
  const max = Math.max(...data.map((d) => d.value), target, 1) * 1.1;
  const W = 300, H = 140;
  const x = (i: number) => (i / Math.max(data.length - 1, 1)) * W;
  const y = (v: number) => H - (v / max) * H;
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const last = data[data.length - 1];
  return (
    <Card title={f.period === "month" ? "Ritmo de fechamento semanal" : "Ritmo de fechamento mensal"} subtitle="Realizado vs. meta proporcional"
      right={<span className="text-sm font-semibold tabular-nums">{brl(last?.value ?? 0)}</span>}>
      <div className={cn("relative", big ? "h-64" : "h-44")}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible text-primary">
          {[0.25, 0.5, 0.75].map((t) => <line key={t} x1="0" x2={W} y1={H * t} y2={H * t} className="stroke-border" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
          <line x1="0" x2={W} y1={y(target)} y2={y(target)} className="stroke-muted-foreground" strokeDasharray="4 4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <path d={`${line} L${W},${H} L0,${H} Z`} fill="currentColor" opacity="0.1" />
          <path d={line} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="absolute right-0 rounded bg-card px-1 text-[11px] text-muted-foreground" style={{ top: `calc(${(y(target) / H) * 100}% - 18px)` }}>meta {brl(target)}</span>
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">{data.map((d) => <span key={d.label}>{d.label}</span>)}</div>
    </Card>
  );
}

export const WIDGETS = {
  funnel: { title: "Funil", C: FunnelWidget, span: "lg:col-span-2" },
  ranking: { title: "Ranking", C: RankingWidget, span: "" },
  pace: { title: "Ritmo", C: PaceWidget, span: "lg:col-span-2" },
  loss: { title: "Perdas", C: LossWidget, span: "" },
  risk: { title: "Risco", C: RiskWidget, span: "lg:col-span-3" },
} as const;
export type WidgetId = keyof typeof WIDGETS;
export const DEFAULT_ORDER: WidgetId[] = ["funnel", "ranking", "pace", "loss", "risk"];
