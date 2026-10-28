import { useEffect } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { atRisk, hygiene, kpis, taskHealth, brl, type Filters } from "@/lib/crm-data";

type Alert = { id: string; title: string; detail: string; tone: "danger" | "warn"; ask: string };

export function buildAlerts(f: Filters): Alert[] {
  const out: Alert[] = [];
  const risk = atRisk(f), h = hygiene(f), t = taskHealth(f), k = kpis(f);
  if (risk.length) out.push({ id: "risk", tone: "danger", title: `${risk.length} negócios em risco`, detail: `${brl(risk.reduce((a, d) => a + d.value, 0))} sem atividade há 10+ dias`, ask: "Quais negócios estão em risco e o que fazer com eles?" });
  if (h.noNext.length) out.push({ id: "next", tone: "warn", title: `${h.noNext.length} negócios sem próxima atividade`, detail: `${brl(h.noNextValue)} parados no funil`, ask: "Quais negócios estão sem próxima atividade?" });
  if (t.overdue) out.push({ id: "tasks", tone: "warn", title: `${t.overdue} tarefas atrasadas`, detail: "Follow-ups passaram do prazo", ask: "Quem tem mais tarefas atrasadas?" });
  if (k.goal && k.goalPct < 0.5) out.push({ id: "goal", tone: "danger", title: "Meta em risco", detail: `${Math.round(k.goalPct * 100)}% atingido · faltam ${brl(k.goal - k.revenue)}`, ask: "Como bater a meta deste período?" });
  return out;
}

export function AlertsBell({ f, onAsk }: { f: Filters; onAsk: (q: string) => void }) {
  const list = buildAlerts(f);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button aria-label="Alertas" title="Alertas" className="relative grid size-8 place-items-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground">
          <Bell className="size-4" />
          {list.length > 0 && <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold text-primary-foreground">{list.length}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3 text-sm font-semibold">Alertas</div>
        {list.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">Tudo em dia. Nenhum alerta agora.</p> : (
          <ul className="divide-y divide-border">
            {list.map((a) => (
              <li key={a.id}>
                <button onClick={() => onAsk(a.ask)} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-muted/50">
                  <span className={a.tone === "danger" ? "mt-1.5 size-2 shrink-0 rounded-full bg-danger" : "mt-1.5 size-2 shrink-0 rounded-full bg-warning"} />
                  <span className="min-w-0"><span className="block text-sm font-medium">{a.title}</span><span className="block text-xs text-muted-foreground">{a.detail}</span><span className="mt-1 block text-xs font-medium text-primary">Perguntar ao Atlas →</span></span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** Celebrates goal milestones (50/75/100%) once per milestone per period and company. */
export function useGoalCelebration(goalPct: number, key: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !Number.isFinite(goalPct)) return;
    const hit = [1, 0.75, 0.5].find((m) => goalPct >= m);
    if (!hit) return;
    const k = `sd-goal-${key}-${hit}`;
    if (localStorage.getItem(k)) return;
    localStorage.setItem(k, "1");
    if (hit === 1) toast.success("Meta batida! 🚀 Missão cumprida, comandante.", { duration: 6000 });
    else toast(`Você já passou de ${hit * 100}% da meta. Continue assim!`);
  }, [goalPct, key, enabled]);
}
