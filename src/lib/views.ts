/** Dashboard views (painéis): each view is a named set of cards with order and widths. */
export type View = { id: string; name: string; order: string[]; sizes: Record<string, number> };
export type StoredLayout = { order?: string[]; sizes?: Record<string, number>; views?: View[]; active?: string };

export const PRESET_VIEWS = (all: string[]): View[] => [
  { id: "geral", name: "Visão geral", order: [...all], sizes: {} },
  { id: "comercial", name: "Comercial & Funil", order: ["funnel", "evolution", "ranking", "pace", "sources", "loss"].filter((x) => all.includes(x)), sizes: {} },
  { id: "operacao", name: "Operação & Produtividade", order: ["activity", "tasks", "hygiene", "support", "risk"].filter((x) => all.includes(x)), sizes: {} },
];

/** Ready-made dashboard templates offered in the "Novo painel" gallery. Sizes are 12-col units. */
export type Template = { id: string; name: string; audience: string; description: string; order: string[]; sizes: Record<string, number> };
export const TEMPLATES: Template[] = [
  { id: "executivo", name: "Executivo", audience: "Diretoria", description: "Resultado, evolução e origem das vendas em 30 segundos.",
    order: ["evolution", "sources", "pace", "ranking"], sizes: { evolution: 8, sources: 4, pace: 8, ranking: 4 } },
  { id: "pipeline", name: "Pipeline & Conversão", audience: "Gestão comercial", description: "Gargalos do funil, tempo parado, perdas e negócios em risco.",
    order: ["funnel", "loss", "risk", "sources", "pace"], sizes: { funnel: 12, loss: 4, risk: 8, sources: 4, pace: 8 } },
  { id: "higiene", name: "Saúde do CRM", audience: "Operações", description: "Negócios sem próxima atividade, follow-ups e carteira esquecida.",
    order: ["hygiene", "tasks", "risk"], sizes: { hygiene: 12, tasks: 4, risk: 8 } },
  { id: "time", name: "Performance do time", audience: "Reunião semanal", description: "Ranking com meta, atividades por vendedor e ritmo de vendas.",
    order: ["ranking", "activity", "pace"], sizes: { ranking: 6, activity: 6, pace: 12 } },
  { id: "atendimento", name: "Atendimento", audience: "Suporte & SDR", description: "Canais abertos, tarefas e produtividade da equipe.",
    order: ["support", "tasks", "activity"], sizes: { support: 12, tasks: 6, activity: 6 } },
];

/** Builds the view list from a stored layout; legacy {order,sizes} becomes the "Visão geral" view. */
export function loadViews(stored: StoredLayout | null, all: string[]): { views: View[]; active: string } {
  const clean = (o: string[]) => [...new Set(o.filter((x) => all.includes(x)))];
  let views: View[];
  if (stored?.views?.length) {
    views = stored.views.map((v) => ({ ...v, order: clean(v.order), sizes: v.sizes ?? {} }));
  } else {
    views = PRESET_VIEWS(all);
    if (stored?.order?.length) {
      const kept = clean(stored.order);
      views[0] = { ...views[0]!, order: [...new Set([...kept, ...all])], sizes: stored.sizes ?? {} };
    }
  }
  const active = views.some((v) => v.id === stored?.active) ? stored!.active! : views[0]!.id;
  return { views, active };
}

export const newViewId = () => `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
