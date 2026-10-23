import { SELLERS, filterDeals, sellerGoal, productivity, taskHealth, funnel, kpis, support, lossReasons, brl, pct, type Filters } from "@/lib/crm-data";

export type Table = { columns: string[]; rows: (string | number)[][] };

/** CSV with ";" (Excel pt-BR) and quotes escaped; BOM added by the downloader. */
export function toCsv(t: Table): string {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [t.columns, ...t.rows].map((r) => r.map(cell).join(";")).join("\n");
}

export function downloadCsv(name: string, t: Table) {
  const blob = new Blob(["\uFEFF" + toCsv(t)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `${name}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function printTable(title: string, subtitle: string, t: Table) {
  const w = window.open("", "_blank");
  if (!w) return;
  const esc = (s: string | number) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
  w.document.write(`<html><head><title>${esc(title)}</title><style>body{font-family:system-ui,sans-serif;margin:32px;color:#111}h1{font-size:20px;margin:0}p{color:#666;font-size:12px}table{border-collapse:collapse;width:100%;font-size:12px;margin-top:16px}th,td{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left}th{background:#f5f5f5}</style></head><body><h1>Spacedash · ${esc(title)}</h1><p>${esc(subtitle)}</p><table><thead><tr>${t.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${t.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`);
  w.document.close(); w.focus(); w.print();
}

/** Per-seller numbers for the team page and report. */
export function teamRows(f: Filters) {
  const deals = filterDeals(f, ["sellerId"]);
  const prod = new Map(productivity(f).rows.map((r) => [r.id, r]));
  const tasks = new Map(taskHealth(f).rows.map((r) => [r.id, r]));
  return SELLERS.filter((s) => !f.team || s.team === f.team).map((s) => {
    const mine = deals.filter((d) => d.sellerId === s.id);
    const won = mine.filter((d) => d.status === "won");
    const lost = mine.filter((d) => d.status === "lost").length;
    const revenue = won.reduce((a, d) => a + d.value, 0);
    const goal = sellerGoal(s, f.period);
    return {
      id: s.id, name: s.name, team: s.team, photo: s.photo, revenue, goal, goalPct: goal ? revenue / goal : 0,
      won: won.length, open: mine.filter((d) => d.status === "open").length,
      conversion: won.length + lost ? won.length / (won.length + lost) : 0,
      activities: prod.get(s.id)?.total ?? 0, overdue: (tasks.get(s.id)?.overdue ?? 0) + (tasks.get(s.id)?.lateActs ?? 0),
    };
  }).filter((r) => r.revenue + r.open + r.activities > 0 || r.goal > 0).sort((a, b) => b.revenue - a.revenue);
}

export const REPORTS = [
  { id: "summary", title: "Resumo do período", desc: "Receita, meta, ticket médio e conversão." },
  { id: "funnel", title: "Funil de vendas", desc: "Negócios e valores por etapa, com taxa de passagem." },
  { id: "team", title: "Desempenho da equipe", desc: "Receita, meta, conversão e atividades por vendedor." },
  { id: "losses", title: "Motivos de perda", desc: "Quantidade e valor perdido por motivo." },
  { id: "support", title: "Atendimento", desc: "Conversas por canal e por atendente." },
] as const;
export type ReportId = (typeof REPORTS)[number]["id"];

export function buildReport(id: ReportId, f: Filters): Table {
  if (id === "summary") {
    const k = kpis(f);
    return { columns: ["Indicador", "Valor"], rows: [["Receita realizada", brl(k.revenue, false)], ["Meta", brl(k.goal, false)], ["Atingimento", pct(k.goalPct)], ["Negócios ganhos", k.wonCount], ["Ticket médio", brl(k.ticket, false)], ["Negócios em aberto", k.openCount], ["Valor em aberto", brl(k.openValue, false)], ["Conversão", pct(k.conversion)]] };
  }
  if (id === "funnel") return { columns: ["Etapa", "Negócios", "Valor", "Passagem"], rows: funnel(f).map((s) => [s.stage, s.count, brl(s.value, false), pct(s.pass)]) };
  if (id === "team") return { columns: ["Vendedor", "Equipe", "Receita", "Meta", "Atingimento", "Ganhos", "Em aberto", "Conversão", "Atividades", "Pendências atrasadas"], rows: teamRows(f).map((r) => [r.name, r.team, brl(r.revenue, false), brl(r.goal, false), pct(r.goalPct), r.won, r.open, pct(r.conversion), r.activities, r.overdue]) };
  if (id === "losses") return { columns: ["Motivo", "Negócios", "Valor perdido"], rows: lossReasons(f).filter((l) => l.count).map((l) => [l.reason, l.count, brl(l.value, false)]) };
  const s = support(f);
  return { columns: ["Canal", "Conversas", "Participação"], rows: s.byChannel.map((c) => [String(c.channel), c.count, pct(c.share)]) };
}
