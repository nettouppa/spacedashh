import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Bell, GripVertical, LayoutGrid, Monitor, Sparkles, X, Save, RotateCcw, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMPANIES, SELLERS, TEAMS, sellerName, type Filters, type Period, type Stage } from "@/lib/crm-data";
import { DEFAULT_ORDER, KpiStrip, WIDGETS, type WidgetId } from "@/components/dash/widgets";
import { AiPanel } from "@/components/dash/ai-panel";
import { TvMode } from "@/components/dash/tv-mode";
import type { AiAction } from "@/lib/ai.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Violeta Sales Hub — Painel de CRM e Vendas Bitrix24" },
      { name: "description", content: "Painel gerencial multi-empresa integrado ao Bitrix24: funil, ranking, metas, riscos, modo TV e assistente de IA." },
      { property: "og:title", content: "Violeta Sales Hub — Painel de CRM e Vendas" },
      { property: "og:description", content: "BI comercial com cross-filtering, modo TV e IA sobre seus dados do Bitrix24." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const LAYOUT_KEY = "vsh-layout-v1";
const ME = "s1"; // simulated logged-in seller

function SortableItem({ id, edit, children, span }: { id: string; edit: boolean; children: React.ReactNode; span: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative", span, isDragging && "z-10 opacity-80", edit && "rounded-[2rem] ring-2 ring-dashed ring-primary/40")}>
      {edit && (
        <button {...attributes} {...listeners} aria-label="Arrastar" className="absolute left-1/2 top-2 z-10 -translate-x-1/2 cursor-grab rounded-full bg-primary px-3 py-1 text-primary-foreground shadow-glow active:cursor-grabbing">
          <GripVertical className="size-4" />
        </button>
      )}
      {children}
    </div>
  );
}

function Select<T extends string>({ value, onChange, options, label }: { value?: T; onChange: (v?: T) => void; options: { v: T; l: string }[]; label: string }) {
  return (
    <select aria-label={label} value={value ?? ""} onChange={(e) => onChange((e.target.value || undefined) as T | undefined)}
      className="h-10 rounded-full border-0 bg-card px-4 text-sm shadow-soft outline-none focus:ring-2 focus:ring-primary">
      <option value="">{label}</option>
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}

function Index() {
  const [f, setF] = useState<Filters>({ period: "month" });
  const [profile, setProfile] = useState<"manager" | "seller">("manager");
  const [order, setOrder] = useState<WidgetId[]>(DEFAULT_ORDER);
  const [edit, setEdit] = useState(false);
  const [saved, setSaved] = useState(false);
  const [ai, setAi] = useState(false);
  const [tv, setTv] = useState(false);

  useEffect(() => {
    try { const s = JSON.parse(localStorage.getItem(LAYOUT_KEY) || "null"); if (Array.isArray(s) && s.length === DEFAULT_ORDER.length) setOrder(s); } catch { /* ignore */ }
  }, []);

  const eff: Filters = profile === "seller" ? { ...f, sellerId: ME, team: undefined } : f;
  const set = useCallback((patch: Partial<Filters>) => {
    setF((prev) => ({ ...prev, ...patch }));
  }, []);
  const setEff = (patch: Partial<Filters>) => { if (profile === "seller") delete patch.sellerId; set(patch); };

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = (e: DragEndEvent) => {
    if (e.over && e.active.id !== e.over.id)
      setOrder((o) => arrayMove(o, o.indexOf(e.active.id as WidgetId), o.indexOf(e.over!.id as WidgetId)));
  };
  const saveLayout = () => { localStorage.setItem(LAYOUT_KEY, JSON.stringify(order)); setSaved(true); setEdit(false); setTimeout(() => setSaved(false), 2000); };

  const onAi = (a: AiAction) => {
    if (a.tvMode) setTv(true);
    if (a.clear) { setF({ period: a.period ?? f.period }); return; }
    const patch: Partial<Filters> = {};
    if (a.period) patch.period = a.period;
    (["company", "team", "sellerId", "stage", "lossReason"] as const).forEach((k) => {
      if (k in a) (patch as Record<string, unknown>)[k] = a[k] ?? undefined;
    });
    set(patch);
  };

  const chips: { k: keyof Filters; label: string }[] = [];
  if (f.company) chips.push({ k: "company", label: `Empresa: ${f.company}` });
  if (f.team && profile === "manager") chips.push({ k: "team", label: `Equipe: ${f.team}` });
  if (f.sellerId && profile === "manager") chips.push({ k: "sellerId", label: `Vendedor: ${sellerName(f.sellerId)}` });
  if (f.stage) chips.push({ k: "stage", label: `Etapa: ${f.stage}` });
  if (f.lossReason) chips.push({ k: "lossReason", label: `Perda: ${f.lossReason}` });

  const me = SELLERS.find((s) => s.id === ME)!;

  return (
    <div className="min-h-screen bg-page p-3 sm:p-6">
      <div className="mx-auto max-w-[1500px] rounded-[2.5rem] border border-card/60 bg-card/30 p-5 shadow-soft backdrop-blur-sm sm:p-8">
        {/* Top bar */}
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="rounded-full border border-foreground/30 px-5 py-2 text-2xl tracking-tight">Violeta<span className="text-primary">.</span></div>
          <nav className="hidden items-center gap-1 rounded-full bg-card/70 p-1.5 shadow-soft md:flex">
            {(["month", "quarter", "year"] as Period[]).map((p) => (
              <button key={p} onClick={() => set({ period: p })} className={cn("rounded-full px-5 py-2 text-sm transition", f.period === p ? "bg-ink text-ink-foreground" : "hover:bg-background")}>
                {{ month: "Mês", quarter: "Trimestre", year: "Ano" }[p]}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-card/70 p-1 shadow-soft">
              {(["manager", "seller"] as const).map((p) => (
                <button key={p} onClick={() => setProfile(p)} className={cn("rounded-full px-4 py-2 text-sm", profile === p ? "bg-primary text-primary-foreground shadow-glow" : "")}>
                  {p === "manager" ? "Gestor" : "Vendedor"}
                </button>
              ))}
            </div>
            <button onClick={() => setTv(true)} className="flex h-11 items-center gap-2 rounded-full bg-card px-4 text-sm shadow-soft"><Monitor className="size-4" />Modo TV</button>
            <button onClick={() => setAi((v) => !v)} className="flex h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm text-ink-foreground"><Sparkles className="size-4 text-primary" />IA</button>
            <span className="grid size-11 place-items-center rounded-full bg-card shadow-soft"><Bell className="size-4" /></span>
          </div>
        </header>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Bitrix24 · sincronizado há 2 min</p>
            <h1 className="text-4xl font-light tracking-tight sm:text-5xl">{profile === "manager" ? "Bem-vindo, Gestor" : `Olá, ${me.name.split(" ")[0]}`}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select label="Todas empresas" value={f.company} onChange={(v) => set({ company: v })} options={COMPANIES.map((c) => ({ v: c, l: c }))} />
            {profile === "manager" && <>
              <Select label="Todas equipes" value={f.team} onChange={(v) => set({ team: v, sellerId: undefined })} options={TEAMS.map((t) => ({ v: t, l: t }))} />
              <Select label="Todos vendedores" value={f.sellerId} onChange={(v) => set({ sellerId: v })} options={SELLERS.filter((s) => !f.team || s.team === f.team).map((s) => ({ v: s.id, l: s.name }))} />
            </>}
            {edit ? <>
              <button onClick={() => { setOrder(DEFAULT_ORDER); }} className="flex h-10 items-center gap-1 rounded-full bg-card px-4 text-sm shadow-soft"><RotateCcw className="size-4" />Padrão</button>
              <button onClick={saveLayout} className="flex h-10 items-center gap-1 rounded-full bg-primary px-4 text-sm text-primary-foreground shadow-glow"><Save className="size-4" />Salvar layout</button>
            </> : (
              <button onClick={() => setEdit(true)} className="flex h-10 items-center gap-1 rounded-full bg-card px-4 text-sm shadow-soft">
                {saved ? <><Check className="size-4 text-primary" />Salvo</> : <><LayoutGrid className="size-4" />Organizar</>}
              </button>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {chips.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {chips.map((c) => (
              <span key={c.k} className="flex items-center gap-1.5 rounded-full bg-primary-soft py-1 pl-3 pr-1 text-sm text-accent-foreground">
                {c.label}
                <button onClick={() => set({ [c.k]: undefined } as Partial<Filters>)} aria-label="Remover filtro" className="grid size-6 place-items-center rounded-full bg-card"><X className="size-3" /></button>
              </span>
            ))}
            <button onClick={() => setF({ period: f.period })} className="text-sm text-muted-foreground underline-offset-4 hover:underline">Limpar tudo</button>
          </div>
        )}

        <div className="mt-6"><KpiStrip f={eff} set={setEff} /></div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order} strategy={rectSortingStrategy}>
            <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
              {order.map((id) => {
                const W = WIDGETS[id];
                return (
                  <SortableItem key={id} id={id} edit={edit} span={W.span}>
                    <W.C f={eff} set={setEff} />
                  </SortableItem>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <AiPanel open={ai} onClose={() => setAi(false)} f={eff} onAction={onAi} />
      {tv && <TvMode f={eff} set={setEff} onClose={() => setTv(false)} />}
    </div>
  );
}

export type { Stage };
