/** Dashboard views (painéis): each view is a named set of cards with order and widths. */
export type View = { id: string; name: string; order: string[]; sizes: Record<string, number> };
export type StoredLayout = { order?: string[]; sizes?: Record<string, number>; views?: View[]; active?: string };

export const PRESET_VIEWS = (all: string[]): View[] => [
  { id: "geral", name: "Visão geral", order: [...all], sizes: {} },
  { id: "comercial", name: "Comercial & Funil", order: ["funnel", "ranking", "pace", "loss"].filter((x) => all.includes(x)), sizes: {} },
  { id: "operacao", name: "Operação & Produtividade", order: ["activity", "tasks", "risk"].filter((x) => all.includes(x)), sizes: {} },
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
