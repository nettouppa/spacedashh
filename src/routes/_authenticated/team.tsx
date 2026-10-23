import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { meQuery, useWorkspace, WorkspaceShell, DataNotice } from "@/lib/workspace";
import { teamRows, downloadCsv, buildReport } from "@/lib/reports";
import { TEAMS, brl, pct, periodLabel, type Filters, type Period } from "@/lib/crm-data";
import { DateRangePicker } from "@/components/dash/date-range-picker";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/team")({
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  head: () => ({ meta: [
    { title: "Equipe — Spacedash" },
    { name: "description", content: "Desempenho de cada vendedor e equipe: receita, meta, conversão e atividades vindas do Bitrix24." },
    { property: "og:title", content: "Equipe — Spacedash" },
    { property: "og:description", content: "Receita, meta e atividades por vendedor e equipe." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: TeamPage,
});

function TeamPage() {
  const ws = useWorkspace();
  const nav = useNavigate();
  const [f, setF] = useState<Filters>({ period: "month" });
  const eff: Filters = ws.isManager ? f : { ...f, sellerId: ws.membership?.sellerRef ?? "__none__" };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => teamRows(eff).filter((r) => ws.isManager || r.id === ws.membership?.sellerRef), [eff.period, eff.team, ws.real, ws.ready, ws.isManager]);
  const teams = useMemo(() => [...new Set(rows.map((r) => r.team).filter(Boolean))], [rows]);
  const total = rows.reduce((a, r) => a + r.revenue, 0);

  if (!ws.membership) return <WorkspaceShell ws={ws} page="team"><p className="text-sm text-muted-foreground">Sua conta ainda não está vinculada a uma empresa.</p></WorkspaceShell>;
  return (
    <WorkspaceShell ws={ws} page="team">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold tracking-tight">Equipe</h1><DataNotice ws={ws} /></div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker value={f.period} onChange={(p: Period) => setF((x) => ({ ...x, period: p }))} />
          {ws.isManager && <select aria-label="Equipe" value={f.team ?? ""} onChange={(e) => setF((x) => ({ ...x, team: e.target.value || undefined }))} className="h-8 rounded-md border border-border bg-card px-2.5 text-[13px]">
            <option value="">Todas equipes</option>{TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>}
          <button onClick={() => downloadCsv(`equipe-${periodLabel(f.period, true)}`, buildReport("team", eff))} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[13px] font-medium hover:bg-muted"><Download className="size-3.5" />Planilha</button>
        </div>
      </div>

      {ws.isManager && teams.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {teams.map((t) => {
            const m = rows.filter((r) => r.team === t);
            const rev = m.reduce((a, r) => a + r.revenue, 0), goal = m.reduce((a, r) => a + r.goal, 0);
            return (
              <button key={t} onClick={() => setF((x) => ({ ...x, team: x.team === t ? undefined : t }))} className={cn("rounded-xl border bg-card p-4 text-left transition hover:border-primary/40", f.team === t ? "border-primary" : "border-border")}>
                <div className="text-xs text-muted-foreground">{t} · {m.length} pessoas</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">{brl(rev)}</div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(100, goal ? (rev / goal) * 100 : 0)}%` }} /></div>
                <div className="mt-1 text-xs text-muted-foreground tabular-nums">{goal ? `${pct(rev / goal)} da meta` : "Sem meta"} · {total ? pct(rev / total) : "0%"} do total</div>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>{["Vendedor", "Receita", "Meta", "Ganhos", "Em aberto", "Conversão", "Atividades", "Atrasos"].map((h, i) => <th key={h} className={cn("px-4 py-2.5 font-medium", i && "text-right")}>{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {!ws.ready ? <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Carregando…</td></tr>
              : rows.length === 0 ? <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">Nenhum resultado neste período.</td></tr>
              : rows.map((r) => (
                <tr key={r.id} onClick={() => ws.isManager && void nav({ to: "/dashboard", search: { seller: r.id } })} className={cn("tabular-nums", ws.isManager && "cursor-pointer hover:bg-muted/50")}>
                  <td className="px-4 py-2.5"><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.team || "—"}</div></td>
                  <td className="px-4 py-2.5 text-right font-medium">{brl(r.revenue)}</td>
                  <td className="px-4 py-2.5 text-right"><div>{r.goal ? pct(r.goalPct) : "—"}</div><div className="text-xs text-muted-foreground">{r.goal ? brl(r.goal) : ""}</div></td>
                  <td className="px-4 py-2.5 text-right">{r.won}</td>
                  <td className="px-4 py-2.5 text-right">{r.open}</td>
                  <td className="px-4 py-2.5 text-right">{pct(r.conversion)}</td>
                  <td className="px-4 py-2.5 text-right">{r.activities}</td>
                  <td className={cn("px-4 py-2.5 text-right", r.overdue > 0 && "font-medium text-danger")}>{r.overdue}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {ws.isManager && <p className="mt-2 text-xs text-muted-foreground">Clique num vendedor para abrir o painel filtrado por ele.</p>}
    </WorkspaceShell>
  );
}
