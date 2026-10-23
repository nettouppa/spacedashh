import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe, getLayout, saveLayout as saveLayoutFn } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardData } from "@/lib/dashboard-data.functions";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, LayoutGrid, Monitor, X, Save, RotateCcw, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMPANIES, SELLERS, TEAMS, sellerName, rng, setDataset, setGoals, type Filters, type Period, type Stage } from "@/lib/crm-data";
import { getGoals, saveGoals as saveGoalsFn } from "@/lib/goals.functions";
import { GoalsDialog } from "@/components/dash/goals-dialog";
import { Target, Plus, Copy, Pencil, Trash2 } from "lucide-react";
import { loadViews, newViewId, PRESET_VIEWS, type View } from "@/lib/views";
import { DEFAULT_ORDER, KpiStrip, WIDGETS, type WidgetId } from "@/components/dash/widgets";
import { AiPanel } from "@/components/dash/ai-panel";
import { AtlasContext, AtlasIcon, type AtlasRequest } from "@/components/dash/atlas";
import { TvMode } from "@/components/dash/tv-mode";
import { DateRangePicker } from "@/components/dash/date-range-picker";
import { AppShell, Segmented } from "@/components/dash/app-shell";
import type { AiAction } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  // Bitrix24 returns OAuth to the registered Application URL; forward the short-lived code to the callback immediately.
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("code") && p.get("state")) {
      window.location.replace(`/api/public/bitrix/callback?${p.toString()}`);
      throw new Promise(() => {});
    }
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  head: () => ({
    meta: [
      { title: "Spacedash — Painel de CRM e Vendas Bitrix24" },
      { name: "description", content: "Painel gerencial multi-empresa integrado ao Bitrix24: funil, ranking, metas, riscos, modo TV e assistente de IA." },
      { property: "og:title", content: "Spacedash — Painel de CRM e Vendas" },
      { property: "og:description", content: "BI comercial com cross-filtering, modo TV e IA sobre seus dados do Bitrix24." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const meQuery = queryOptions({ queryKey: ["me"], queryFn: () => getMe() });
const COMPANY_KEY = "sd-company";

// Widths are in 12-column grid units; presets map to 1/3, 2/3 and full row.
type Size = number;
const COLS = 12;
const PRESETS: { v: Size; l: string }[] = [{ v: 4, l: "1/3" }, { v: 8, l: "2/3" }, { v: 12, l: "Inteira" }];
const defaultSize = (span: string): Size => (span.includes("3") ? 12 : span.includes("2") ? 8 : 4);
const clampSize = (n: number) => Math.min(COLS, Math.max(3, Math.round(n)));

function SortableItem({ id, edit, children, size, onSize, onHide }: { id: string; edit: boolean; children: React.ReactNode; size: Size; onSize: (s: Size) => void; onHide: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [resizing, setResizing] = useState(false);
  const startResize = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    const el = (e.currentTarget.parentElement as HTMLElement);
    const grid = el.parentElement as HTMLElement;
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
    const colW = (grid.clientWidth - gap * (COLS - 1)) / COLS;
    const left = el.getBoundingClientRect().left;
    setResizing(true);
    const move = (ev: PointerEvent) => onSize(clampSize((ev.clientX - left + gap) / (colW + gap)));
    const up = () => { setResizing(false); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition: resizing ? undefined : transition, ["--span" as string]: size }}
      className={cn("relative dash-span", isDragging && "z-10 opacity-80", edit && "rounded-xl ring-2 ring-primary/40 ring-offset-2 ring-offset-background")}>
      {edit && (
        <div className="absolute left-1/2 top-2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-soft">
          <button {...attributes} {...listeners} aria-label="Arrastar" className="cursor-grab rounded-md bg-primary px-2 py-1 text-primary-foreground active:cursor-grabbing">
            <GripVertical className="size-4" />
          </button>
          {PRESETS.map((p) => (
            <button key={p.v} onClick={() => onSize(p.v)} aria-label={`Largura ${p.l}`}
              className={cn("rounded-md px-2 py-1 text-xs font-medium", size === p.v ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-muted")}>
              {p.l}
            </button>
          ))}
          <span className="px-1.5 text-xs tabular-nums text-subtle-foreground">{size}/{COLS}</span>
          <button onClick={onHide} aria-label="Remover do painel" title="Remover do painel" className="rounded-md px-1.5 py-1 text-muted-foreground hover:bg-muted hover:text-destructive"><X className="size-3.5" /></button>
        </div>
      )}
      {edit && (
        <div onPointerDown={startResize} role="separator" aria-label="Redimensionar largura"
          className="group absolute -right-2 top-0 z-10 hidden h-full w-4 cursor-ew-resize touch-none items-center justify-center lg:flex">
          <span className={cn("h-12 w-1.5 rounded-full bg-primary/50 transition-colors group-hover:bg-primary", resizing && "bg-primary")} />
        </div>
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
  const { data: me } = useSuspenseQuery(meQuery);
  if (!me.memberships.length) return <NoAccess isAdmin={me.isAdmin} />;
  return <Dashboard me={me} />;
}

async function signOut(nav: ReturnType<typeof useNavigate>) {
  await supabase.auth.signOut();
  void nav({ to: "/auth", replace: true });
}

function NoAccess({ isAdmin }: { isAdmin: boolean }) {
  const nav = useNavigate();
  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="max-w-sm rounded-xl border border-border bg-card p-6 text-center">
        <h1 className="text-lg font-semibold">Aguardando convite</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sua conta ainda não está vinculada a nenhuma empresa. Peça ao administrador do Spacedash para liberar seu acesso.</p>
        <div className="mt-5 flex justify-center gap-2">
          {isAdmin && <Link to="/admin" className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Administração</Link>}
          <button onClick={() => signOut(nav)} className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted">Sair</button>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ me: account }: { me: Awaited<ReturnType<typeof getMe>> }) {
  const nav = useNavigate();
  const loadLayout = useServerFn(getLayout);
  const persistLayout = useServerFn(saveLayoutFn);
  const [companyId, setCompanyId] = useState(account.memberships[0]!.companyId);
  const membership = account.memberships.find((m) => m.companyId === companyId) ?? account.memberships[0]!;
  const profile: "manager" | "seller" = membership.role === "gestor" ? "manager" : "seller";
  const loadData = useServerFn(getDashboardData);
  const dataQ = useQuery({ queryKey: ["dash-data", companyId], queryFn: () => loadData({ data: { companyId } }), staleTime: 5 * 60_000 });
  const real = dataQ.data ?? null;
  const loadGoals = useServerFn(getGoals);
  const persistGoals = useServerFn(saveGoalsFn);
  const goalsQ = useQuery({ queryKey: ["goals", companyId], queryFn: () => loadGoals({ data: { companyId } }) });
  const [goalsOpen, setGoalsOpen] = useState(false);
  // Widgets read the module-level dataset; swap it before children render.
  useMemo(() => setDataset(real), [real]);
  useMemo(() => setGoals(goalsQ.data ?? []), [goalsQ.data]);
  const ME = membership.sellerRef && SELLERS.some((s) => s.id === membership.sellerRef) ? membership.sellerRef : (SELLERS[0]?.id ?? "s1");
  const [f, setF] = useState<Filters>({ period: "month" });
  const [views, setViews] = useState<View[]>(() => PRESET_VIEWS(DEFAULT_ORDER));
  const [active, setActive] = useState("geral");
  const current = views.find((v) => v.id === active) ?? views[0];
  const order = (current?.order ?? []) as WidgetId[];
  const sizes = (current?.sizes ?? {}) as Partial<Record<WidgetId, Size>>;
  const hidden = DEFAULT_ORDER.filter((id) => !order.includes(id));
  const patchView = (fn: (v: View) => View) => setViews((vs) => vs.map((v) => (v.id === (current?.id ?? active) ? fn(v) : v)));
  const setOrder = (u: WidgetId[] | ((o: WidgetId[]) => WidgetId[])) => patchView((v) => ({ ...v, order: typeof u === "function" ? u(v.order as WidgetId[]) : u }));
  const setSizes = (u: (p: Partial<Record<WidgetId, Size>>) => Partial<Record<WidgetId, Size>> | Record<string, never>) => patchView((v) => ({ ...v, sizes: u(v.sizes as Partial<Record<WidgetId, Size>>) as Record<string, number> }));
  const [edit, setEdit] = useState(false);
  const [saved, setSaved] = useState(false);
  const [ai, setAi] = useState(false);
  const [tv, setTv] = useState(false);
  const closeTv = useCallback(() => setTv(false), []);
  const { refetch: refetchData } = dataQ, { refetch: refetchGoals } = goalsQ;
  const refreshTv = useCallback(() => { void refetchData(); void refetchGoals(); }, [refetchData, refetchGoals]);
  const [atlasReq, setAtlasReq] = useState<AtlasRequest | null>(null);
  const atlasCtx = { hidden: edit, request: (mode: "explain" | "ask", topic: string) => { setAi(true); setAtlasReq({ mode, topic, id: Date.now() }); } };

  useEffect(() => {
    const saved = localStorage.getItem(COMPANY_KEY);
    if (saved && account.memberships.some((m) => m.companyId === saved)) setCompanyId(saved);
  }, [account.memberships]);
  useEffect(() => {
    localStorage.setItem(COMPANY_KEY, companyId);
    let live = true;
    void loadLayout({ data: { companyId } }).then((l) => {
      if (!live) return;
      const r = loadViews(l, DEFAULT_ORDER);
      setViews(r.views); setActive(r.active);
    }).catch(() => { /* keep defaults */ });
    return () => { live = false; };
  }, [companyId, loadLayout]);

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
  const persist = (vs: View[], a: string) => persistLayout({ data: { companyId, layout: { views: vs, active: a } } }).catch(() => { /* ignore */ });
  const saveLayout = async () => { await persist(views, active); setSaved(true); setEdit(false); setTimeout(() => setSaved(false), 2000); };
  const switchView = (id: string) => { setActive(id); setEdit(false); void persist(views, id); };
  const addView = (dup: boolean) => {
    const name = window.prompt("Nome do novo painel", dup ? `${current?.name ?? "Painel"} (cópia)` : "Meu painel")?.trim().slice(0, 60);
    if (!name) return;
    const v: View = { id: newViewId(), name, order: dup ? [...order] : [], sizes: dup ? { ...sizes } as Record<string, number> : {} };
    const vs = [...views, v]; setViews(vs); setActive(v.id); setEdit(!dup || edit); void persist(vs, v.id);
  };
  const renameView = (id: string) => {
    const v = views.find((x) => x.id === id); if (!v) return;
    const name = window.prompt("Renomear painel", v.name)?.trim().slice(0, 60); if (!name) return;
    const vs = views.map((x) => (x.id === id ? { ...x, name } : x)); setViews(vs); void persist(vs, active);
  };
  const deleteView = () => {
    if (views.length < 2 || !window.confirm(`Excluir o painel "${current?.name}"?`)) return;
    const vs = views.filter((x) => x.id !== active); setViews(vs); setActive(vs[0]!.id); setEdit(false); void persist(vs, vs[0]!.id);
  };

  const onAi = (a: AiAction) => {
    if (a.tvMode) setTv(true);
    const period: Period | undefined = a.from && a.to ? { from: new Date(`${a.from}T00:00:00Z`), to: new Date(`${a.to}T23:59:59.999Z`) } : a.period;
    if (a.clear) { setF({ period: period ?? f.period }); return; }
    const patch: Partial<Filters> = {};
    if (period && !Number.isNaN(rng(period).from.getTime()) && !Number.isNaN(rng(period).to.getTime())) patch.period = period;
    (["company", "team", "sellerId", "stage", "lossReason"] as const).forEach((k) => {
      if (k in a) (patch as Record<string, unknown>)[k] = a[k] ?? undefined;
    });
    set(patch);
  };

  const chips: { k: keyof Filters; label: string }[] = [];
  if (f.company) chips.push({ k: "company", label: `${real ? "Funil" : "Empresa"}: ${f.company}` });
  if (f.team && profile === "manager") chips.push({ k: "team", label: `Equipe: ${f.team}` });
  if (f.sellerId && profile === "manager") chips.push({ k: "sellerId", label: `Vendedor: ${sellerName(f.sellerId)}` });
  if (f.stage) chips.push({ k: "stage", label: `Etapa: ${f.stage}` });
  if (f.lossReason) chips.push({ k: "lossReason", label: `Perda: ${f.lossReason}` });

  const me = SELLERS.find((s) => s.id === ME) ?? { id: ME, name: account.name, team: "", photo: "https://i.pravatar.cc/80?img=68", goal: 0 };

  return (
    <AppShell compact={ai} userName={account.name} userPhoto={profile === "manager" ? "https://i.pravatar.cc/80?img=68" : me.photo}
      companyName={membership.companyName} roleLabel={profile === "manager" ? "Gestor" : "Colaborador"} isAdmin={account.isAdmin} onSignOut={() => signOut(nav)}
      topRight={<>
        {account.memberships.length > 1 && (
          <select aria-label="Empresa" value={companyId} onChange={(e) => { setCompanyId(e.target.value); setF({ period: f.period }); }}
            className="h-8 max-w-44 rounded-md border border-border bg-card px-2.5 text-[13px] font-medium outline-none focus:ring-2 focus:ring-primary">
            {account.memberships.map((m) => <option key={m.companyId} value={m.companyId}>{m.companyName}</option>)}
          </select>
        )}
        {(profile === "manager" || account.isAdmin) && <button onClick={() => setGoalsOpen(true)} className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-card px-3 text-[13px] font-medium hover:bg-muted"><Target className="size-3.5" />Metas</button>}
        <button onClick={() => setTv(true)} className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-border bg-card px-3 text-[13px] font-medium hover:bg-muted"><Monitor className="size-3.5" />Modo TV</button>
        <button onClick={() => setAi((v) => !v)} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:bg-primary/90"><AtlasIcon className="size-4" />Atlas</button>
      </>}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{profile === "manager" ? "Visão geral comercial" : `Meu desempenho · ${me.name}`}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">{real ? <><span className="size-1.5 rounded-full bg-success" />Bitrix24 · {real.domain} · {real.deals.length} negócios{real.lastSyncAt ? ` · sincronizado em ${new Date(real.lastSyncAt).toLocaleString("pt-BR")}` : ""} <Link to="/integrations" className="ml-1 text-primary hover:underline">Sincronizar</Link></>
            : dataQ.isLoading ? <><span className="size-1.5 animate-pulse rounded-full bg-primary" />Carregando dados do Bitrix24…</>
            : <><span className="size-1.5 rounded-full bg-warning" />Dados de demonstração · Bitrix24 não conectado <Link to="/integrations" className="ml-1 text-primary hover:underline">Configurar integração</Link></>}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangePicker value={f.period} onChange={(p: Period) => set({ period: p })} />
          <Select label={real ? "Todos funis" : "Todas empresas"} value={f.company} onChange={(v) => set({ company: v })} options={COMPANIES.map((c) => ({ v: c, l: c }))} />
          {profile === "manager" && <>
            <Select label="Todas equipes" value={f.team} onChange={(v) => set({ team: v, sellerId: undefined })} options={TEAMS.map((t) => ({ v: t, l: t }))} />
            <Select label="Todos vendedores" value={f.sellerId} onChange={(v) => set({ sellerId: v })} options={SELLERS.filter((s) => !f.team || s.team === f.team).map((s) => ({ v: s.id, l: s.name }))} />
          </>}
          {edit ? <>
            <button onClick={() => { setOrder(PRESET_VIEWS(DEFAULT_ORDER).find((p) => p.id === active)?.order as WidgetId[] ?? DEFAULT_ORDER); setSizes(() => ({})); }} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[13px] font-medium hover:bg-muted"><RotateCcw className="size-3.5" />Padrão</button>
            <button onClick={saveLayout} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground"><Save className="size-3.5" />Salvar layout</button>
          </> : (
            <button onClick={() => setEdit(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[13px] font-medium hover:bg-muted">
              {saved ? <><Check className="size-3.5 text-success" />Salvo</> : <><LayoutGrid className="size-3.5" />Personalizar</>}
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1 border-b border-border">
        {views.map((v) => (
          <button key={v.id} onClick={() => switchView(v.id)} onDoubleClick={() => renameView(v.id)}
            className={cn("-mb-px border-b-2 px-3 py-2 text-[13px] font-medium transition-colors", v.id === active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {v.name}
          </button>
        ))}
        <button onClick={() => addView(false)} className="inline-flex items-center gap-1 px-2 py-2 text-[13px] font-medium text-muted-foreground hover:text-primary"><Plus className="size-3.5" />Novo painel</button>
        <div className="ml-auto flex items-center gap-1 pb-1">
          <button onClick={() => addView(true)} title="Duplicar painel" className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"><Copy className="size-3.5" /></button>
          <button onClick={() => renameView(active)} title="Renomear painel" className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"><Pencil className="size-3.5" /></button>
          {views.length > 1 && <button onClick={deleteView} title="Excluir painel" className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive"><Trash2 className="size-3.5" /></button>}
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

      <AtlasContext.Provider value={atlasCtx}>
      <div className="mt-5"><KpiStrip f={eff} set={setEff} /></div>

      {edit && hidden.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-card px-3 py-2">
          <span className="text-xs font-medium text-muted-foreground">Adicionar card a este painel</span>
          {hidden.map((id) => (
            <button key={id} onClick={() => setOrder((o) => [...o, id])} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs font-medium hover:bg-muted"><Plus className="size-3" />{WIDGETS[id].title}</button>
          ))}
        </div>
      )}
      {order.length === 0 && !edit && (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Este painel ainda não tem cards. <button onClick={() => setEdit(true)} className="font-medium text-primary hover:underline">Personalizar</button>
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <div className="mt-4 grid grid-cols-1 gap-4 dash-grid">
            {order.map((id) => {
              const W = WIDGETS[id];
              return (
                <SortableItem key={id} id={id} edit={edit} size={sizes[id] ?? defaultSize(W.span)} onSize={(z) => setSizes((p) => ({ ...p, [id]: z }))} onHide={() => setOrder((o) => o.filter((x) => x !== id))}>
                  <W.C f={eff} set={setEff} />
                </SortableItem>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
      </AtlasContext.Provider>

      <AiPanel open={ai} onClose={() => setAi(false)} f={eff} onAction={onAi} request={atlasReq} onRestore={setF} userName={account.name.split(" ")[0]!} />
      {tv && <TvMode f={eff} set={setEff} views={views} onClose={closeTv} onRefresh={refreshTv} share={profile === "manager" || account.isAdmin ? { companyId } : undefined} />}
      {goalsOpen && <GoalsDialog onClose={() => setGoalsOpen(false)} onSave={async (month, goals) => { await persistGoals({ data: { companyId, month, goals } }); await goalsQ.refetch(); }} />}
    </AppShell>
  );
}

export type { Stage };
