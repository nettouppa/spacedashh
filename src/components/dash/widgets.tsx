import { AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  atRisk, brl, funnel, kpis, lossReasons, pace, pct, ranking, sellerName, type Filters, type Stage,
} from "@/lib/crm-data";

export type SetFilter = (patch: Partial<Filters>) => void;
type P = { f: Filters; set: SetFilter; big?: boolean | undefined };

export function Tag({ children, tone = "primary" }: { children: React.ReactNode; tone?: "primary" | "danger" | "muted" }) {
  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
      tone === "primary" && "bg-primary-soft text-accent-foreground",
      tone === "danger" && "bg-danger-soft text-danger",
      tone === "muted" && "bg-muted text-muted-foreground")}>{children}</span>
  );
}

export function Card({ className, children, title, tag, right }: { className?: string; children: React.ReactNode; title?: string; tag?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className={cn("h-full rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-soft", className)}>
      {title && (
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="space-y-2">{tag}<h3 className="text-lg font-bold tracking-tight">{title}</h3></div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function KpiStrip({ f, big }: P) {
  const k = kpis(f);
  const num = cn("font-bold tracking-tight tabular-nums", big ? "text-6xl" : "text-3xl");
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="sm:col-span-2 lg:col-span-1">
        <Tag>Faturado vs. meta</Tag>
        <div className={cn("mt-3", num)}>{brl(k.revenue)}</div>
        <div className="mt-3 h-2.5 rounded-full bg-muted">
          <div className="h-2.5 rounded-full bg-primary" style={{ width: `${Math.min(k.goalPct, 1) * 100}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-sm text-muted-foreground"><span className="font-semibold text-foreground">{pct(k.goalPct)} da meta</span><span>Meta {brl(k.goal)}</span></div>
      </Card>
      <Card><Tag tone="muted">Ticket médio</Tag><div className={cn("mt-3", num)}>{brl(k.ticket)}</div><p className="mt-2 text-sm text-muted-foreground">{k.wonCount} negócios ganhos</p></Card>
      <Card><Tag tone="muted">Negócios abertos</Tag><div className={cn("mt-3", num)}>{k.openCount}</div><p className="mt-2 text-sm text-muted-foreground">{brl(k.openValue)} em pipeline</p></Card>
      <Card><Tag tone="muted">Conversão</Tag><div className={cn("mt-3", num)}>{pct(k.conversion)}</div><p className="mt-2 text-sm text-muted-foreground">ganhos ÷ (ganhos + perdidos)</p></Card>
    </div>
  );
}

const STAGE_SHADES = ["bg-primary-soft", "bg-lilac/50", "bg-lilac", "bg-primary/80", "bg-primary"];

export function FunnelWidget({ f, set, big }: P) {
  const data = funnel(f);
  const max = data[0]?.value || 1;
  return (
    <Card title="Funil de vendas" tag={<Tag>Pipeline</Tag>} right={<span className="text-sm text-muted-foreground">Clique numa etapa para filtrar</span>}>
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-x-4 gap-y-3 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Etapa</span><span />
        <span className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor</span>
        <span className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Qtd</span>
        <span className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Passagem</span>
        {data.map((s, i) => {
          const active = f.stage === s.stage;
          const dim = f.stage && !active;
          const click = () => set({ stage: active ? undefined : (s.stage as Stage) });
          return (
            <button key={s.stage} onClick={click} className={cn("col-span-5 grid grid-cols-subgrid items-center rounded-xl px-2 py-1.5 text-left transition hover:bg-muted", active && "bg-primary-soft", dim && "opacity-45")}>
              <span className={cn("w-28 font-semibold", big && "w-40 text-lg")}>{s.stage}</span>
              <span className="h-full min-w-24"><span className={cn("block rounded-md", big ? "h-8" : "h-5", STAGE_SHADES[i])} style={{ width: `${Math.max((s.value / max) * 100, 4)}%` }} /></span>
              <span className={cn("text-right font-semibold tabular-nums", big && "text-lg")}>{brl(s.value)}</span>
              <span className="w-10 text-right tabular-nums text-muted-foreground">{s.count}</span>
              <span className="w-16 text-right tabular-nums text-muted-foreground">{i ? pct(s.pass) : "—"}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

export function RankingWidget({ f, set, big }: P) {
  const data = ranking(f);
  const max = data[0]?.total || 1;
  return (
    <Card title="Ranking de executivos" tag={<Tag>Vendas ganhas</Tag>}>
      <div className="space-y-1">
        {data.map((s, i) => {
          const active = f.sellerId === s.id;
          return (
            <button key={s.id} onClick={() => set({ sellerId: active ? undefined : s.id })}
              className={cn("flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-muted", active && "bg-primary-soft", f.sellerId && !active && "opacity-45")}>
              <span className="w-5 text-sm font-semibold text-muted-foreground">{i + 1}</span>
              <img src={s.photo} alt={s.name} className={cn("rounded-lg object-cover", big ? "size-14" : "size-10")} loading="lazy" />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2 text-sm"><span className={cn("truncate font-semibold", big && "text-lg")}>{s.name}</span><span className="font-semibold tabular-nums">{brl(s.total)}</span></div>
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
    <Card title="Negócios em risco" tag={<Tag tone="danger">Atenção</Tag>}
      right={<div className="text-right"><div className={cn("font-bold tabular-nums text-danger", big ? "text-6xl" : "text-3xl")}>{data.length}</div><div className="text-sm text-muted-foreground">{brl(total)}</div></div>}>
      <p className="-mt-2 mb-3 text-sm text-muted-foreground">Acima de R$ 20 mil e sem atividade há 10+ dias</p>
      <div className="max-h-80 divide-y divide-border overflow-auto">
        {data.slice(0, big ? 6 : 8).map((d) => (
          <div key={d.id} className="flex items-center gap-3 py-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-danger-soft"><AlertTriangle className="size-4 text-danger" /></span>
            <div className="min-w-0 flex-1">
              <div className={cn("truncate text-sm font-semibold", big && "text-base")}>{d.title}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" />{d.lastActivityDays} dias · {sellerName(d.sellerId)} · {d.stage}</div>
            </div>
            <span className="text-sm font-bold tabular-nums">{brl(d.value)}</span>
          </div>
        ))}
        {!data.length && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum negócio crítico</p>}
      </div>
    </Card>
  );
}

export function LossWidget({ f, set, big }: P) {
  const data = lossReasons(f);
  const max = Math.max(...data.map((d) => d.count), 1);
  const total = data.reduce((a, d) => a + d.count, 0);
  return (
    <Card title="Motivos de perda" tag={<Tag tone="muted">{total} perdidos</Tag>}>
      <div className="space-y-2">
        {data.map((d, i) => {
          const active = f.lossReason === d.reason;
          return (
            <button key={d.reason} onClick={() => set({ lossReason: active ? undefined : d.reason })}
              className={cn("w-full rounded-xl p-2 text-left transition hover:bg-muted", active && "bg-primary-soft", f.lossReason && !active && "opacity-45")}>
              <div className={cn("flex justify-between text-sm", big && "text-base")}><span className="font-semibold">{d.reason}</span><span className="tabular-nums text-muted-foreground"><b className="text-foreground">{d.count}</b> · {brl(d.value)}</span></div>
              <div className="mt-1.5 h-2 rounded-full bg-muted"><div className={cn("h-2 rounded-full", i === 0 ? "bg-primary" : "bg-lilac")} style={{ width: `${(d.count / max) * 100}%` }} /></div>
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
    <Card title={f.period === "month" ? "Ritmo semanal" : "Ritmo mensal"} tag={<Tag>Fechamentos</Tag>}
      right={<div className="text-right"><div className="text-sm text-muted-foreground">Período atual</div><div className="text-lg font-bold">{brl(last?.value ?? 0)}</div></div>}>
      <div className={cn("flex items-end justify-between gap-2", big ? "h-64" : "h-44")}>
        {data.map((d, i) => {
          const isLast = i === data.length - 1;
          return (
            <div key={d.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">{d.value ? brl(d.value).replace("R$ ", "") : ""}</span>
              <div className={cn("w-full max-w-9 rounded-md", isLast ? "bg-primary" : "bg-lilac/60")} style={{ height: `${Math.max((d.value / max) * 75, 3)}%` }} />
              <span className="text-xs font-medium text-muted-foreground">{d.label}</span>
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
