import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, LayoutGrid, Monitor, Sparkles, X, Save, RotateCcw, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMPANIES, SELLERS, TEAMS, sellerName, type Filters, type Period, type Stage } from "@/lib/crm-data";
import { DEFAULT_ORDER, KpiStrip, WIDGETS, type WidgetId } from "@/components/dash/widgets";
import { AiPanel } from "@/components/dash/ai-panel";
import { TvMode } from "@/components/dash/tv-mode";
import { AppShell, Segmented } from "@/components/dash/app-shell";
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

const LAYOUT_KEY = "vsh-layout-v2";
const ME = "s1"; // simulated logged-in seller

function SortableItem({ id, edit, children, span }: { id: string; edit: boolean; children: React.ReactNode; span: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative", span, isDragging && "z-10 opacity-80", edit && "rounded-xl ring-2 ring-primary/40 ring-offset-2 ring-offset-background")}>
      {edit && (
        <button {...attributes} {...listeners} aria-label="Arrastar" className="absolute left-1/2 top-2 z-10 -translate-x-1/2 cursor-grab rounded-lg bg-primary px-3 py-1 text-primary-foreground active:cursor-grabbing">
          <GripVertical className="size-4" />
        </button>
      )}
      {children}
    </div>
  );
}

function Select<T extends string>({ value, onChange, options, label }: { value?: T | undefined; onChange: (v?: T) => void; options: { v: T; l: string }[]; label: string }) {
  return (
    <select aria-label={label} value={value ?? ""} onChange={(e) => onChange((e.target.value || undefined) as T | undefined)}
      className="h-8 rounded-md border border-border bg-card px-2.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-primary">
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
    <AppShell userName={profile === "manager" ? "Gestor Comercial" : me.name} userPhoto={profile === "manager" ? "https://i.pravatar.cc/80?img=68" : me.photo}
      topRight={<>
        <Segmented value={profile} onChange={setProfile} options={[{ v: "manager", l: "Gestor" }, { v: "seller", l: "Vendedor" }]} />
        <button onClick={() => setTv(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[13px] font-medium hover:bg-muted"><Monitor className="size-3.5" />Modo TV</button>
        <button onClick={() => setAi((v) => !v)} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:bg-primary/90"><Sparkles className="size-3.5" />Copilot</button>
      </>}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{profile === "manager" ? "Visão geral comercial" : `Meu desempenho · ${me.name}`}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><span className="size-1.5 rounded-full bg-success" />Sincronizado com Bitrix24 há 2 min</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented value={f.period} onChange={(p: Period) => set({ period: p })} options={[{ v: "month", l: "Mês" }, { v: "quarter", l: "Trimestre" }, { v: "year", l: "Ano" }]} />
          <Select label="Todas empresas" value={f.company} onChange={(v) => set({ company: v })} options={COMPANIES.map((c) => ({ v: c, l: c }))} />
          {profile === "manager" && <>
            <Select label="Todas equipes" value={f.team} onChange={(v) => set({ team: v, sellerId: undefined })} options={TEAMS.map((t) => ({ v: t, l: t }))} />
            <Select label="Todos vendedores" value={f.sellerId} onChange={(v) => set({ sellerId: v })} options={SELLERS.filter((s) => !f.team || s.team === f.team).map((s) => ({ v: s.id, l: s.name }))} />
          </>}
          {edit ? <>
            <button onClick={() => setOrder(DEFAULT_ORDER)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[13px] font-medium hover:bg-muted"><RotateCcw className="size-3.5" />Padrão</button>
            <button onClick={saveLayout} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground"><Save className="size-3.5" />Salvar layout</button>
          </> : (
            <button onClick={() => setEdit(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[13px] font-medium hover:bg-muted">
              {saved ? <><Check className="size-3.5 text-success" />Salvo</> : <><LayoutGrid className="size-3.5" />Personalizar</>}
            </button>
          )}
        </div>
      </div>

      {chips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">Filtros ativos</span>
          {chips.map((c) => (
            <span key={c.k} className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-primary-soft py-0.5 pl-2 pr-0.5 text-xs font-medium text-accent-foreground">
              {c.label}
              <button onClick={() => set({ [c.k]: undefined } as Partial<Filters>)} aria-label="Remover filtro" className="grid size-5 place-items-center rounded hover:bg-card"><X className="size-3" /></button>
            </span>
          ))}
          <button onClick={() => setF({ period: f.period })} className="ml-auto text-xs font-medium text-muted-foreground hover:text-foreground">Limpar tudo</button>
        </div>
      )}

      <div className="mt-5"><KpiStrip f={eff} set={setEff} /></div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
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

      <AiPanel open={ai} onClose={() => setAi(false)} f={eff} onAction={onAi} />
      {tv && <TvMode f={eff} set={setEff} onClose={() => setTv(false)} />}
    </AppShell>
  );
}

export type { Stage };
