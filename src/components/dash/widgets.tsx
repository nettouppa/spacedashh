import { ArrowUpRight, Flame, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  atRisk, brl, funnel, kpis, lossReasons, pace, pct, ranking, sellerName, type Filters, type Stage,
} from "@/lib/crm-data";

export type SetFilter = (patch: Partial<Filters>) => void;
type P = { f: Filters; set: SetFilter; big?: boolean };

export function Card({ className, children, title, action }: { className?: string; children: React.ReactNode; title?: string; action?: React.ReactNode }) {
  return (
    <div className={cn("h-full rounded-[2rem] bg-card p-6 text-card-foreground shadow-soft", className)}>
      {title && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="text-xl font-normal tracking-tight">{title}</h3>
          {action ?? <span className="grid size-10 place-items-center rounded-full bg-background"><ArrowUpRight className="size-4" /></span>}
        </div>
      )}
      {children}
    </div>
  );
}

export function KpiStrip({ f, big }: P) {
  const k = kpis(f);
  const g = Math.min(k.goalPct, 1);
  return (
    <Card className="bg-transparent p-2 shadow-none">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="mb-2 flex justify-between text-sm text-muted-foreground"><span>Faturamento vs. Meta</span><span>Meta {brl(k.goal)}</span></div>
          <div className={cn("flex w-full gap-1.5", big ? "h-20" : "h-14")}>
            <div className="flex items-center rounded-full bg-ink px-5 text-sm text-ink-foreground" style={{ width: `${Math.max(g * 55, 14)}%` }}>{pct(k.goalPct)}</div>
            <div className="flex items-center rounded-full bg-primary px-5 text-sm text-primary-foreground shadow-glow" style={{ width: `${Math.max(k.conversion * 35, 12)}%` }}>{pct(k.conversion)} conv.</div>
            <div className="stripes flex flex-1 items-center rounded-full border border-border px-5 text-sm text-muted-foreground">faltam {brl(Math.max(k.goal - k.revenue, 0))}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4">
          {[
            ["Faturado", brl(k.revenue)], ["Ticket médio", brl(k.ticket)], ["Abertos", String(k.openCount)], ["Conversão", pct(k.conversion)],
          ].map(([l, v]) => (
            <div key={l} className="text-right">
              <div className={cn("font-light tracking-tight tabular-nums", big ? "text-6xl" : "text-4xl")}>{v}</div>
              <div className="text-sm text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function FunnelWidget({ f, set, big }: P) {
  const data = funnel(f);
  const max = data[0]?.value || 1;
  return (
    <Card title="Funil de vendas">
      <div className="space-y-2.5">
        {data.map((s, i) => {
          const active = f.stage === s.stage;
          const dim = f.stage && !active;
          return (
            <button key={s.stage} onClick={() => set({ stage: active ? undefined : (s.stage as Stage) })}
              className={cn("group flex w-full items-center gap-3 text-left transition", dim && "opacity-40")}>
              <div className={cn("w-28 shrink-0 text-sm", big && "w-40 text-lg")}>{s.stage}</div>
              <div className="relative flex-1">
                <div className={cn("flex items-center justify-between rounded-full px-4 text-sm transition-all",
                  big ? "h-14 text-lg" : "h-10",
                  i === data.length - 1 ? "bg-primary text-primary-foreground shadow-glow" : i % 2 ? "bg-ink text-ink-foreground" : "stripes bg-primary-soft text-accent-foreground",
                  active && "ring-4 ring-primary/30")}
                  style={{ width: `${Math.max((s.value / max) * 100, 28)}%` }}>
                  <span>{brl(s.value)}</span><span className="opacity-70">{s.count}</span>
                </div>
              </div>
              <div className="w-12 text-right text-xs text-muted-foreground">{i ? pct(s.pass) : "—"}</div>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Clique numa etapa para filtrar. % = taxa de passagem.</p>
    </Card>
  );
}

export function RankingWidget({ f, set, big }: P) {
  const data = ranking(f);
  const max = data[0]?.total || 1;
  return (
    <Card title="Ranking de executivos">
      <div className="space-y-3">
        {data.map((s, i) => {
          const active = f.sellerId === s.id;
          return (
            <button key={s.id} onClick={() => set({ sellerId: active ? undefined : s.id })}
              className={cn("flex w-full items-center gap-3 rounded-2xl p-1.5 text-left transition hover:bg-background", active && "bg-primary-soft", f.sellerId && !active && "opacity-40")}>
              <span className="w-5 text-sm text-muted-foreground">{i + 1}</span>
              <img src={s.photo} alt={s.name} className={cn("rounded-full object-cover", big ? "size-14" : "size-10")} loading="lazy" />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between text-sm"><span className={cn("truncate", big && "text-lg")}>{s.name}</span><span className="tabular-nums">{brl(s.total)}</span></div>
                <div className="mt-1.5 h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${(s.total / max) * 100}%` }} />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

export function RiskWidget({ f, big }: P) {
  const data = atRisk(f);
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <div className="h-full rounded-[2rem] bg-ink p-6 text-ink-foreground shadow-soft">
      <div className="flex items-start justify-between">
        <div><h3 className="text-xl">Negócios em risco</h3><p className="text-sm opacity-60">≥ R$20 mil · sem atividade há 10+ dias</p></div>
        <div className={cn("font-light tabular-nums", big ? "text-6xl" : "text-4xl")}>{data.length}</div>
      </div>
      <div className="mt-1 text-sm opacity-70">{brl(total)} em jogo</div>
      <div className="mt-4 max-h-80 space-y-2 overflow-auto pr-1">
        {data.slice(0, big ? 6 : 7).map((d) => (
          <div key={d.id} className="flex items-center gap-3 rounded-2xl p-2">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink-muted"><Flame className="size-4 text-primary" /></span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{d.title}</div>
              <div className="flex items-center gap-1 text-xs opacity-60"><Clock className="size-3" />{d.lastActivityDays}d · {sellerName(d.sellerId)} · {d.stage}</div>
            </div>
            <span className="rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">{brl(d.value)}</span>
          </div>
        ))}
        {!data.length && <p className="py-6 text-center text-sm opacity-60">Nenhum negócio crítico 🎉</p>}
      </div>
    </div>
  );
}

export function LossWidget({ f, set, big }: P) {
  const data = lossReasons(f);
  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((a, d) => a + d.count, 0);
  return (
    <Card title="Motivos de perda" action={<span className="text-3xl font-light">{total}</span>}>
      <div className={cn("flex items-end justify-between gap-3", big ? "h-64" : "h-48")}>
        {data.map((d, i) => {
          const active = f.lossReason === d.reason;
          return (
            <button key={d.reason} onClick={() => set({ lossReason: active ? undefined : d.reason })}
              className={cn("flex h-full flex-1 flex-col items-center justify-end gap-2", f.lossReason && !active && "opacity-40")}>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs">{d.count}</span>
              <div className={cn("w-full max-w-12 rounded-full transition-all", i === 0 ? "bg-primary shadow-glow" : active ? "bg-primary" : "bg-ink", "min-h-3")}
                style={{ height: `${(d.count / max) * 75}%` }} />
              <span className="text-center text-[11px] leading-tight text-muted-foreground">{d.reason}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

export function PaceWidget({ f, big }: P) {
  const data = pace(f);
  const max = Math.max(...data.map((d) => d.value), 1);
  const last = data[data.length - 1];
  return (
    <Card title={f.period === "month" ? "Ritmo semanal" : "Ritmo mensal"} action={<span className="text-sm text-muted-foreground">{brl(last?.value ?? 0)} no atual</span>}>
      <div className={cn("flex items-end justify-between gap-2", big ? "h-64" : "h-48")}>
        {data.map((d, i) => {
          const isLast = i === data.length - 1;
          return (
            <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              {isLast && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">{brl(d.value)}</span>}
              <div className={cn("w-2.5 rounded-full", isLast ? "bg-primary" : d.value ? "bg-ink" : "stripes bg-muted")} style={{ height: `${Math.max((d.value / max) * 80, 6)}%` }} />
              <span className="size-1.5 rounded-full bg-foreground/60" />
              <span className="text-[11px] text-muted-foreground">{d.label}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export const WIDGETS = {
  funnel: { title: "Funil", C: FunnelWidget, span: "lg:col-span-2" },
  ranking: { title: "Ranking", C: RankingWidget, span: "" },
  risk: { title: "Risco", C: RiskWidget, span: "" },
  loss: { title: "Perdas", C: LossWidget, span: "" },
  pace: { title: "Ritmo", C: PaceWidget, span: "" },
} as const;
export type WidgetId = keyof typeof WIDGETS;
export const DEFAULT_ORDER: WidgetId[] = ["funnel", "ranking", "risk", "pace", "loss"];
