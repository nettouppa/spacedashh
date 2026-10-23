import { useEffect, useState } from "react";
import { X, RefreshCw, Pause, Play, ChevronLeft, ChevronRight, Link2, Copy, Check, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { KpiStrip, WIDGETS, type SetFilter, type WidgetId } from "./widgets";
import { AtlasContext } from "./atlas";
import type { Filters } from "@/lib/crm-data";
import type { View } from "@/lib/views";
import { createTvLink, listTvLinks, revokeTvLink } from "@/lib/tv.functions";

const defaultSize = (span: string) => (span.includes("3") ? 12 : span.includes("2") ? 8 : 6);
const INTERVALS = [15, 30, 60, 120];

export function TvMode({ f, set, views, interval: initial = 30, onClose, onRefresh, title, share }: {
  f: Filters; set: SetFilter; views: View[]; interval?: number; onClose?: () => void; onRefresh?: () => void; title?: string;
  share?: { companyId: string } | undefined;
}) {
  const list = views.filter((v) => v.order.length > 0);
  const [view, setView] = useState(0);
  const [paused, setPaused] = useState(false);
  const [sec, setSec] = useState(initial);
  const [elapsed, setElapsed] = useState(0);
  const [clock, setClock] = useState(new Date());
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [shareOpen, setShareOpen] = useState(false);
  const n = Math.max(list.length, 1);
  const go = (d: number) => { setView((v) => (v + d + n) % n); setElapsed(0); };

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setElapsed((e) => { if (e + 0.1 >= sec) { setView((v) => (v + 1) % n); return 0; } return e + 0.1; }), 100);
    return () => clearInterval(id);
  }, [paused, sec, n]);
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    const c = setInterval(() => setClock(new Date()), 30_000);
    const r = setInterval(() => { onRefresh?.(); setLastRefresh(new Date()); }, 5 * 60_000);
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === " ") setPaused((p) => !p);
    };
    window.addEventListener("keydown", k);
    return () => { clearInterval(c); clearInterval(r); window.removeEventListener("keydown", k); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, onRefresh, n]);

  const cur = list[view % n];
  const p = { f, set, big: true };
  const hhmm = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const btn = "grid size-11 place-items-center rounded-full border border-border bg-card text-foreground hover:bg-muted";
  return (
    <AtlasContext.Provider value={{ request: () => {}, hidden: true }}>
    <div className="dark fixed inset-0 z-50 overflow-auto bg-background p-8 text-foreground">
      <div className="mb-5 flex items-center justify-between gap-6">
        <div className="min-w-0">
          <div className="text-sm font-medium uppercase tracking-[0.3em] text-primary">Spacedash · {title ?? "TV"}</div>
          <h1 className="truncate text-5xl font-semibold tracking-tight">{cur?.name ?? "Sem painéis"}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <div className="text-4xl font-semibold tabular-nums">{hhmm(clock)}</div>
            <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground"><RefreshCw className="size-3" />Atualizado {hhmm(lastRefresh)}</div>
          </div>
          <button onClick={() => go(-1)} className={btn} aria-label="Painel anterior"><ChevronLeft /></button>
          <button onClick={() => setPaused((x) => !x)} className={btn} aria-label={paused ? "Retomar rotação" : "Pausar rotação"}>{paused ? <Play /> : <Pause />}</button>
          <button onClick={() => go(1)} className={btn} aria-label="Próximo painel"><ChevronRight /></button>
          <select value={sec} onChange={(e) => setSec(Number(e.target.value))} aria-label="Tempo por painel" className="h-11 rounded-full border border-border bg-card px-3 text-sm">
            {INTERVALS.map((s) => <option key={s} value={s}>{s < 60 ? `${s}s` : `${s / 60} min`} por painel</option>)}
          </select>
          {share && <button onClick={() => setShareOpen(true)} className={btn} aria-label="Link para TV"><Link2 /></button>}
          {onClose && <button onClick={onClose} className={btn} aria-label="Sair do modo TV"><X /></button>}
        </div>
      </div>
      <div className="mb-6 flex gap-2">
        {list.map((v, i) => (
          <button key={v.id} onClick={() => { setView(i); setElapsed(0); }} className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-label={v.name}>
            <div className="h-full bg-primary" style={{ width: i < view ? "100%" : i === view ? `${(elapsed / sec) * 100}%` : "0%" }} />
          </button>
        ))}
      </div>
      {cur && (
        <div key={cur.id} className="animate-in fade-in duration-700">
          <KpiStrip {...p} />
          <div className="mt-6 grid gap-6 dash-grid">
            {(cur.order as WidgetId[]).filter((id) => WIDGETS[id]).map((id) => {
              const W = WIDGETS[id];
              return <div key={id} className="dash-span" style={{ "--span": cur.sizes[id] ?? defaultSize(W.span) } as React.CSSProperties}><W.C {...p} /></div>;
            })}
          </div>
        </div>
      )}
      {share && shareOpen && <ShareDialog companyId={share.companyId} views={list} sec={sec} onClose={() => setShareOpen(false)} />}
    </div>
    </AtlasContext.Provider>
  );
}

function ShareDialog({ companyId, views, sec, onClose }: { companyId: string; views: View[]; sec: number; onClose: () => void }) {
  const listFn = useServerFn(listTvLinks), createFn = useServerFn(createTvLink), revokeFn = useServerFn(revokeTvLink);
  const [links, setLinks] = useState<Awaited<ReturnType<typeof listTvLinks>>>([]);
  const [name, setName] = useState("TV do salão de vendas");
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const refresh = () => listFn({ data: { companyId } }).then(setLinks).catch(() => {});
  useEffect(() => { void refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const create = async () => {
    setErr(null);
    try {
      const { token } = await createFn({ data: { companyId, name, intervalSec: sec, views } });
      setUrl(`${window.location.origin}/tv/${token}`); void refresh();
    } catch (e) { setErr((e as Error).message); }
  };
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-background/80 p-6" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 text-sm" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between"><h2 className="text-lg font-semibold">Link para TV</h2><button onClick={onClose} aria-label="Fechar"><X className="size-4" /></button></div>
        <p className="mb-4 text-muted-foreground">Abra o link no navegador da TV, sem login. Ele mostra estes {views.length} painéis, trocando a cada {sec}s, com a visão de gestor da empresa. Qualquer pessoa com o link vê os dados: revogue quando não usar mais.</p>
        {url ? (
          <div className="mb-4 space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Copie agora — o link não será mostrado de novo.</div>
            <div className="flex gap-2">
              <input readOnly value={url} className="h-9 flex-1 rounded-md border border-border bg-background px-2 text-xs" onFocus={(e) => e.target.select()} />
              <button onClick={() => { void navigator.clipboard.writeText(url); setCopied(true); }} className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 font-medium text-primary-foreground">{copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? "Copiado" : "Copiar"}</button>
            </div>
          </div>
        ) : (
          <div className="mb-4 flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="h-9 flex-1 rounded-md border border-border bg-background px-2" aria-label="Nome da TV" />
            <button onClick={create} className="h-9 rounded-md bg-primary px-3 font-medium text-primary-foreground">Gerar link</button>
          </div>
        )}
        {err && <div className="mb-3 text-destructive">{err}</div>}
        {links.length > 0 && (
          <div className="space-y-1 border-t border-border pt-3">
            <div className="mb-1 text-xs font-medium text-muted-foreground">Links ativos</div>
            {links.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted">
                <div><div className="font-medium">{l.name}</div><div className="text-xs text-muted-foreground">{l.last_seen_at ? `Visto ${new Date(l.last_seen_at).toLocaleString("pt-BR")}` : "Ainda não aberto"}</div></div>
                <button onClick={async () => { await revokeFn({ data: { id: l.id } }); void refresh(); }} className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"><Trash2 className="size-3" />Revogar</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
