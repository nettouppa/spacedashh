import { useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { AtlasTrigger } from "./atlas";
import { cn } from "@/lib/utils";
import {
  ACTIVITY_LABELS, paceWeekly, atRisk, brl, duration, evolution, productivity, support, taskHealth, type ActivityType, funnel, funnelPipeline, goalFor, kpis, lossReasons, pace, pct, previousKpis, ranking, sellerName, type Filters, type Stage,
} from "@/lib/crm-data";

export type SetFilter = (patch: Partial<Filters>) => void;
type P = { f: Filters; set: SetFilter; big?: boolean | undefined };

export function Card({ className, children, title, subtitle, right }: { className?: string; children: React.ReactNode; title?: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <section className={cn("flex h-full flex-col rounded-xl border border-border bg-card text-card-foreground shadow-soft", className)}>
      {title && (
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div><h3 className="text-sm font-semibold">{title}</h3>{subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}</div>
          <div className="flex items-center gap-2">{right}<AtlasTrigger topic={title} /></div>
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
          <div className="flex items-center justify-between gap-2"><span className={cn("text-[13px] font-medium text-muted-foreground", big && "text-lg")}>{it.label}</span><div className="flex items-center gap-1">{it.delta}{!big && <AtlasTrigger topic={it.label} />}</div></div>
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
    <Card title="Funil de vendas" subtitle={funnelPipeline(f) ? `${funnelPipeline(f)} · clique numa etapa para filtrar` : "Clique numa etapa para filtrar o painel"}
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
        <div className="p-4"><div className="text-xs font-medium text-muted-foreground">Eficiência topo → fundo</div><div className={cn("mt-1 font-semibold tabular-nums text-primary", big ? "text-5xl" : "text-2xl")}>{(overall * 100).toFixed(1).replace(".", ",")}%</div><div className="mt-0.5 text-xs text-muted-foreground">{last?.count ?? 0} ganhos de {data[0]?.count ?? 0} entradas</div></div>
        <div className="p-4"><div className="text-xs font-medium text-muted-foreground">Valor convertido</div><div className={cn("mt-1 font-semibold tabular-nums", big ? "text-5xl" : "text-2xl", "whitespace-nowrap")}>{brl(last?.value ?? 0)}</div><div className="mt-0.5 text-xs text-muted-foreground">de {brl(data[0]?.value ?? 0)} no topo</div></div>
        <div className="p-4"><div className="text-xs font-medium text-muted-foreground">Maior gargalo</div><div className={cn("mt-1 font-semibold", big ? "text-2xl" : "text-base")}>{data[gap.i - 1]?.stage} → {data[gap.i]?.stage}</div><span className={cn("mt-1 inline-block rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums", passTone(gap.pass))}>{pct(gap.pass)} de passagem</span></div>
      </div>
      {(() => {
        // Horizontal flow funnel: a smooth ribbon whose thickness is proportional to each stage.
        const VW = 1000, VH = 240, cols = data.length || 1, cw = VW / cols, mid = VH / 2;
        const hs = widths.map((w) => (w / 100) * (VH - 8));
        const xs = data.map((_, i) => i * cw);
        let top = `M0,${mid - (hs[0] ?? 0) / 2}`, bot = "";
        data.forEach((_, i) => {
          const h = hs[i]!, x0 = xs[i]!, flat = x0 + cw * 0.55, x1 = x0 + cw, hn = hs[i + 1] ?? h;
          top += ` L${flat},${mid - h / 2} C${flat + cw * 0.25},${mid - h / 2} ${x1 - cw * 0.2},${mid - hn / 2} ${x1},${mid - hn / 2}`;
        });
        for (let i = data.length - 1; i >= 0; i--) {
          const h = hs[i]!, x0 = xs[i]!, flat = x0 + cw * 0.55, x1 = x0 + cw, hn = hs[i + 1] ?? h;
          bot += ` L${x1},${mid + hn / 2} C${x1 - cw * 0.2},${mid + hn / 2} ${flat + cw * 0.25},${mid + h / 2} ${flat},${mid + h / 2} L${x0},${mid + h / 2}`;
        }
        const d = `${top}${bot} Z`;
        const selIdx = data.findIndex((s) => s.stage === f.stage);
        return (
          <div>
            <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {data.map((s, i) => (
                <button key={s.stage} onClick={() => set({ stage: f.stage === s.stage ? undefined : (s.stage as Stage) })}
                  className={cn("min-w-0 border-l border-border px-4 pb-3 text-left transition-opacity first:border-l-0", f.stage && f.stage !== s.stage && "opacity-40")}>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><span className="size-2 rounded-full" style={{ background: `color-mix(in oklab, var(--primary) ${35 + (i / n) * 65}%, var(--card))` }} />{s.stage}</div>
                  <div className={cn("mt-1 whitespace-nowrap font-semibold tracking-tight tabular-nums", big ? "text-4xl" : "text-xl")}>{s.count}<span className="ml-1 text-xs font-normal text-muted-foreground">negócios</span></div>
                  <div className={cn("whitespace-nowrap tabular-nums font-medium text-primary", big ? "text-xl" : "text-sm")}>{brl(s.value)}</div>
                </button>
              ))}
            </div>
            <div className="relative">
              <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" className={cn("block w-full", big ? "h-72" : "h-52")}>
                <defs>
                  <linearGradient id="fnl" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="color-mix(in oklab, var(--primary) 30%, var(--card))" />
                    <stop offset="100%" stopColor="var(--primary)" />
                  </linearGradient>
                </defs>
                {xs.slice(1).map((x) => <line key={x} x1={x} x2={x} y1={0} y2={VH} stroke="var(--border)" vectorEffect="non-scaling-stroke" />)}
                {selIdx >= 0 && <rect x={xs[selIdx]} y={0} width={cw} height={VH} fill="var(--primary)" opacity="0.06" />}
                <path d={d} fill="url(#fnl)" />
              </svg>
              {data.slice(1).map((s, k) => (
                <span key={s.stage} className={cn("absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-card px-2.5 py-1 font-semibold tabular-nums shadow-soft", big ? "text-base" : "text-xs", passTone(s.pass))}
                  style={{ left: `${((k + 1) / cols) * 100}%` }}>
                  {pct(s.pass)}
                </span>
              ))}
            </div>
            <div className="grid pt-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {data.map((s, i) => {
                const lost = i < data.length - 1 ? s.count - (data[i + 1]?.count ?? 0) : 0;
                return (
                  <div key={s.stage} className="whitespace-nowrap border-l border-border px-4 text-xs first:border-l-0">
                    {i < data.length - 1
                      ? <><span className="font-semibold tabular-nums text-danger">−{lost}</span> <span className="text-muted-foreground">saíram</span></>
                      : <span className="font-semibold text-success">Ticket {brl(s.count ? s.value / s.count : 0)}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
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
    <Card title={paceWeekly(f.period) ? "Ritmo de fechamento semanal" : "Ritmo de fechamento mensal"} subtitle="Realizado vs. meta proporcional"
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

const ACT_ORDER: ActivityType[] = ["call", "meeting", "email", "chat", "task"];
const ACT_TONE: Record<ActivityType, string> = { call: "bg-primary", meeting: "bg-primary/70", email: "bg-primary/45", chat: "bg-primary/25", task: "bg-muted-foreground/30" };

export function ActivityWidget({ f, set, big }: P) {
  const { rows, by, total } = productivity(f);
  const max = Math.max(...rows.map((r) => r.total), 1);
  return (
    <Card title="Produtividade da equipe" subtitle="Atividades registradas no CRM no período"
      right={<span className="text-sm font-semibold tabular-nums">{total.toLocaleString("pt-BR")}</span>}>
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {ACT_ORDER.map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("size-2 rounded-sm", ACT_TONE[k])} />{ACTIVITY_LABELS[k]} <span className="font-semibold tabular-nums text-foreground">{by[k]}</span>
          </span>
        ))}
      </div>
      <div className="-mx-2 max-h-[22rem] space-y-0.5 overflow-auto">
        {rows.slice(0, big ? 8 : 20).map((r) => {
          const active = f.sellerId === r.id;
          return (
            <button key={r.id} onClick={() => set({ sellerId: active ? undefined : r.id })}
              className={cn("grid w-full grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted/60", active && "bg-primary-soft", f.sellerId && !active && "opacity-40")}>
              <span className="flex min-w-0 items-center gap-2"><img src={r.photo} alt="" className="size-6 shrink-0 rounded-full object-cover" /><span className={cn("truncate text-sm font-medium", big && "text-base")}>{r.name}</span></span>
              <span className="flex h-2 overflow-hidden rounded-full bg-muted" style={{ width: `${(r.total / max) * 100}%` }}>
                {ACT_ORDER.map((k) => r.by[k] ? <span key={k} className={ACT_TONE[k]} style={{ width: `${(r.by[k] / r.total) * 100}%` }} /> : null)}
              </span>
              <span className="text-right text-xs tabular-nums"><span className="font-semibold">{r.total}</span>
                <span className="ml-2 text-muted-foreground">{r.wins ? `${r.perWin.toFixed(1)}/venda` : "sem vendas"}</span></span>
            </button>
          );
        })}
        {!rows.length && <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma atividade no período</p>}
      </div>
    </Card>
  );
}

export function TasksWidget({ f, set, big }: P) {
  const h = taskHealth(f);
  const stat = (label: string, v: string, tone?: string) => (
    <div className="rounded-lg border border-border px-3 py-2.5"><div className="text-xs text-muted-foreground">{label}</div><div className={cn("mt-0.5 text-lg font-semibold tabular-nums", big && "text-2xl", tone)}>{v}</div></div>
  );
  return (
    <Card title="Tarefas e follow-ups" subtitle="Pendências abertas e atrasadas agora">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stat("Tarefas abertas", String(h.open))}
        {stat("Tarefas atrasadas", String(h.overdue), h.overdue ? "text-danger" : undefined)}
        {stat("Atividades vencidas", String(h.lateActs), h.lateActs ? "text-warning" : undefined)}
        {stat("Concluídas no prazo", h.closed ? pct(h.onTimeRate) : "—")}
      </div>
      <div className="-mx-5 mt-4 max-h-[18rem] overflow-auto border-t border-border">
        <table className={cn("w-full text-sm", big && "text-base")}>
          <thead className="sticky top-0 bg-card"><tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-5 py-2.5 font-medium">Responsável</th><th className="py-2.5 text-right font-medium">Abertas</th><th className="py-2.5 text-right font-medium">Atrasadas</th><th className="px-5 py-2.5 text-right font-medium">Ativ. vencidas</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {h.rows.slice(0, big ? 6 : 15).map((r) => {
              const active = f.sellerId === r.id;
              return (
                <tr key={r.id} onClick={() => set({ sellerId: active ? undefined : r.id })} className={cn("cursor-pointer hover:bg-muted/60", active && "bg-primary-soft", f.sellerId && !active && "opacity-40")}>
                  <td className="px-5 py-2.5"><span className="flex items-center gap-2"><img src={r.photo} alt="" className="size-6 rounded-full object-cover" /><span className="font-medium">{r.name}</span></span></td>
                  <td className="py-2.5 text-right tabular-nums">{r.open}</td>
                  <td className="py-2.5 text-right tabular-nums">{r.overdue ? <span className="rounded-md bg-danger-soft px-1.5 py-0.5 font-medium text-danger">{r.overdue}</span> : 0}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{r.lateActs ? <span className="rounded-md bg-warning-soft px-1.5 py-0.5 font-medium text-warning">{r.lateActs}</span> : 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!h.rows.length && <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma pendência</p>}
      </div>
    </Card>
  );
}

export function SupportWidget({ f, set, big }: P) {
  const s = support(f);
  const stat = (label: string, v: string, hint?: string) => (
    <div className="rounded-lg border border-border px-3 py-2.5"><div className="text-xs text-muted-foreground">{label}</div><div className={cn("mt-0.5 text-lg font-semibold tabular-nums", big && "text-2xl")}>{v}</div>{hint && <div className="text-[11px] text-subtle-foreground">{hint}</div>}</div>
  );
  return (
    <Card title="Atendimento" subtitle="Conversas dos Canais Abertos no período"
      right={<span className="text-sm font-semibold tabular-nums">{s.total.toLocaleString("pt-BR")}</span>}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stat("Conversas", s.total.toLocaleString("pt-BR"), `${s.open} em aberto`)}
        {stat("1ª resposta média", duration(s.avgFirstMin), s.avgFirstMin === null ? "não informado pelo Bitrix24" : undefined)}
        {stat("Tempo de atendimento", duration(s.avgHandleMin))}
        {stat("Taxa de resolução", s.total ? pct(s.resolutionRate) : "—")}
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-medium text-muted-foreground">Volume por canal</div>
          <div className="space-y-2">
            {s.byChannel.map((c) => (
              <div key={c.channel}>
                <div className="flex justify-between text-sm"><span className="font-medium">{c.channel}</span><span className="tabular-nums"><span className="font-semibold">{pct(c.share)}</span><span className="ml-2 text-xs text-muted-foreground">{c.count}</span></span></div>
                <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary/70" style={{ width: `${c.share * 100}%` }} /></div>
              </div>
            ))}
            {!s.byChannel.length && <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma conversa no período</p>}
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs font-medium text-muted-foreground">Atendentes</div>
          <div className="-mx-2 max-h-[16rem] space-y-0.5 overflow-auto">
            {s.rows.slice(0, big ? 6 : 15).map((r) => {
              const active = f.sellerId === r.id;
              return (
                <button key={r.id} onClick={() => set({ sellerId: active ? undefined : r.id })}
                  className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted/60", active && "bg-primary-soft", f.sellerId && !active && "opacity-40")}>
                  <img src={r.photo} alt="" className="size-6 rounded-full object-cover" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.name}</span>
                  <span className="text-xs tabular-nums"><span className="font-semibold">{r.count}</span><span className="ml-2 text-muted-foreground">{duration(r.avgHandle)}</span></span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function EvolutionWidget({ f, big }: P) {
  const e = evolution(f);
  const W = 300, H = 140;
  const max = Math.max(e.goal, e.projection, ...e.days.map((d) => d.actual ?? 0), 1) * 1.08;
  const x = (day: number) => ((day - 1) / Math.max(e.daysInMonth - 1, 1)) * W;
  const y = (v: number) => H - (v / max) * H;
  const actual = e.days.filter((d) => d.actual !== null).map((d, i) => `${i ? "L" : "M"}${x(d.day).toFixed(1)},${y(d.actual!).toFixed(1)}`).join(" ");
  const ideal = `M${x(1)},${y(e.days[0]?.ideal ?? 0)} L${W},${y(e.goal)}`;
  const proj = `M${x(e.today)},${y(e.current)} L${W},${y(e.projection)}`;
  const mMax = Math.max(...e.months.map((m) => Math.max(m.revenue, m.goal)), 1);
  const tone = e.projectionPct >= 1 ? "text-success" : e.projectionPct >= 0.8 ? "text-warning" : "text-danger";
  return (
    <Card title="Evolução e ritmo da meta" subtitle="Mês atual acumulado e últimos 6 meses">
      <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border">
        <div className="p-3"><div className="text-xs text-muted-foreground">Realizado no mês</div><div className={cn("mt-0.5 font-semibold tabular-nums", big ? "text-3xl" : "text-lg")}>{brl(e.current)}</div><div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground"><Delta cur={e.current} prev={e.prevSameDay} />vs. mesmo dia do mês anterior</div></div>
        <div className="p-3"><div className="text-xs text-muted-foreground">Projeção de fechamento</div><div className={cn("mt-0.5 font-semibold tabular-nums", big ? "text-3xl" : "text-lg", tone)}>{brl(e.projection)}</div><div className="mt-1 text-[11px] text-muted-foreground">{pct(e.projectionPct)} da meta no ritmo atual</div></div>
        <div className="p-3"><div className="text-xs text-muted-foreground">Meta do mês</div><div className={cn("mt-0.5 font-semibold tabular-nums", big ? "text-3xl" : "text-lg")}>{brl(e.goal)}</div><div className="mt-1 text-[11px] text-muted-foreground">faltam {brl(Math.max(e.goal - e.current, 0))} em {e.daysInMonth - e.today} dias</div></div>
      </div>
      <div className="mt-4 grid gap-5 md:grid-cols-[3fr_2fr]">
        <div>
          <div className={cn("relative", big ? "h-64" : "h-40")}>
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible text-primary">
              {[0.25, 0.5, 0.75].map((t) => <line key={t} x1="0" x2={W} y1={H * t} y2={H * t} className="stroke-border" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
              <path d={ideal} fill="none" className="stroke-muted-foreground" strokeDasharray="4 4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <path d={`${actual} L${x(e.today)},${H} L0,${H} Z`} fill="currentColor" opacity="0.1" />
              <path d={actual} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <path d={proj} fill="none" stroke="currentColor" strokeDasharray="2 3" strokeWidth="1.5" opacity="0.6" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-3 bg-primary" />Realizado</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-0 w-3 border-t border-dashed border-primary" />Projeção</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-0 w-3 border-t border-dashed border-muted-foreground" />Ritmo ideal</span>
          </div>
        </div>
        <div>
          <div className={cn("flex items-end gap-2", big ? "h-64" : "h-40")}>
            {e.months.map((m, i) => (
              <div key={m.key} className="relative flex h-full flex-1 flex-col justify-end" title={`${m.label}: ${brl(m.revenue)} de ${brl(m.goal)}`}>
                <div className="absolute inset-x-0 border-t border-dashed border-muted-foreground/60" style={{ bottom: `${(m.goal / mMax) * 100}%` }} />
                <div className={cn("rounded-t-sm", i === 5 ? "bg-primary" : "bg-primary/35")} style={{ height: `${(m.revenue / mMax) * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2 text-[11px] text-muted-foreground">{e.months.map((m) => <span key={m.key} className="flex-1 text-center">{m.label}</span>)}</div>
        </div>
      </div>
    </Card>
  );
}

export const WIDGETS = {
  funnel: { title: "Funil", C: FunnelWidget, span: "lg:col-span-3" },
  evolution: { title: "Evolução", C: EvolutionWidget, span: "lg:col-span-3" },
  ranking: { title: "Ranking", C: RankingWidget, span: "" },
  pace: { title: "Ritmo", C: PaceWidget, span: "lg:col-span-2" },
  loss: { title: "Perdas", C: LossWidget, span: "" },
  risk: { title: "Risco", C: RiskWidget, span: "lg:col-span-3" },
  activity: { title: "Produtividade", C: ActivityWidget, span: "lg:col-span-2" },
  tasks: { title: "Tarefas", C: TasksWidget, span: "" },
  support: { title: "Atendimento", C: SupportWidget, span: "lg:col-span-3" },
} as const;
export type WidgetId = keyof typeof WIDGETS;
export const DEFAULT_ORDER: WidgetId[] = ["funnel", "evolution", "ranking", "pace", "loss", "activity", "tasks", "support", "risk"];
