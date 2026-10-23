import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";
import { meQuery, useWorkspace, WorkspaceShell, DataNotice } from "@/lib/workspace";
import { REPORTS, buildReport, downloadCsv, printTable, type ReportId } from "@/lib/reports";
import { periodLabel, type Filters, type Period } from "@/lib/crm-data";
import { DateRangePicker } from "@/components/dash/date-range-picker";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reports")({
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  head: () => ({ meta: [
    { title: "Relatórios — Spacedash" },
    { name: "description", content: "Relatórios prontos de vendas, funil, equipe, perdas e atendimento, com exportação em planilha e PDF." },
    { property: "og:title", content: "Relatórios — Spacedash" },
    { property: "og:description", content: "Relatórios comerciais prontos para exportar." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ReportsPage,
});

function ReportsPage() {
  const ws = useWorkspace();
  const [id, setId] = useState<ReportId>("summary");
  const [period, setPeriod] = useState<Period>("month");
  const f: Filters = ws.isManager ? { period } : { period, sellerId: ws.membership?.sellerRef ?? "__none__" };
  const meta = REPORTS.find((r) => r.id === id)!;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const table = useMemo(() => buildReport(id, f), [id, period, ws.real, ws.ready, ws.isManager]);
  const name = `${meta.title} · ${periodLabel(period)}`;

  return (
    <WorkspaceShell ws={ws} page="reports">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1><DataNotice ws={ws} /></div>
        <DateRangePicker value={period} onChange={setPeriod} />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="space-y-1">
          {REPORTS.map((r) => (
            <button key={r.id} onClick={() => setId(r.id)} className={cn("w-full rounded-lg border px-3 py-2.5 text-left transition", id === r.id ? "border-primary bg-primary-soft/40" : "border-transparent hover:bg-muted")}>
              <div className="text-sm font-medium">{r.title}</div><div className="text-xs text-muted-foreground">{r.desc}</div>
            </button>
          ))}
        </div>
        <section className="rounded-xl border border-border bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            <div className="min-w-0 flex-1"><h2 className="font-semibold">{meta.title}</h2><p className="text-xs text-muted-foreground">{periodLabel(period)}</p></div>
            <button disabled={!table.rows.length} onClick={() => downloadCsv(name, table)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-[13px] font-medium hover:bg-muted disabled:opacity-50"><Download className="size-3.5" />Planilha</button>
            <button disabled={!table.rows.length} onClick={() => printTable(meta.title, `${periodLabel(period)} · ${ws.membership?.companyName ?? ""}`, table)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-[13px] font-medium hover:bg-muted disabled:opacity-50"><Printer className="size-3.5" />PDF</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground"><tr>{table.columns.map((c, i) => <th key={c} className={cn("px-4 py-2.5 font-medium", i && "text-right")}>{c}</th>)}</tr></thead>
              <tbody className="divide-y divide-border tabular-nums">
                {!ws.ready ? <tr><td colSpan={table.columns.length} className="px-4 py-8 text-center text-muted-foreground">Carregando…</td></tr>
                  : !table.rows.length ? <tr><td colSpan={table.columns.length} className="px-4 py-8 text-center text-muted-foreground">Sem dados neste período.</td></tr>
                  : table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={cn("px-4 py-2.5", j ? "text-right" : "font-medium")}>{c}</td>)}</tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
