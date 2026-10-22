import { useEffect, useState } from "react";
import { X, RefreshCw } from "lucide-react";
import { FunnelWidget, KpiStrip, LossWidget, PaceWidget, RankingWidget, RiskWidget, type SetFilter } from "./widgets";
import type { Filters } from "@/lib/crm-data";

const VIEWS = ["Visão geral", "Funil & Ranking", "Riscos & Perdas"];

export function TvMode({ f, set, onClose }: { f: Filters; set: SetFilter; onClose: () => void }) {
  const [view, setView] = useState(0);
  const [tick, setTick] = useState(new Date());
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    const r = setInterval(() => setView((v) => (v + 1) % VIEWS.length), 15000);
    const t = setInterval(() => setTick(new Date()), 60000); // auto-refresh
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => { clearInterval(r); clearInterval(t); window.removeEventListener("keydown", k); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  }, [onClose]);
  const p = { f, set, big: true };
  return (
    <div className="dark fixed inset-0 z-50 overflow-auto bg-background p-8 text-foreground">
      <div className="mb-6 flex items-center justify-between">
        <div><div className="text-sm uppercase tracking-[0.3em] text-primary">Violeta Sales Hub · TV</div><h1 className="text-5xl font-extrabold">{VIEWS[view]}</h1></div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">{VIEWS.map((v, i) => <button key={v} onClick={() => setView(i)} className={`h-2.5 rounded-full transition-all ${i === view ? "w-10 bg-primary" : "w-2.5 bg-muted"}`} aria-label={v} />)}</div>
          <span className="flex items-center gap-1 text-sm text-muted-foreground"><RefreshCw className="size-4" />{tick.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
          <button onClick={onClose} className="grid size-12 place-items-center rounded-full bg-card" aria-label="Sair do modo TV"><X /></button>
        </div>
      </div>
      <div key={view} className="animate-in fade-in duration-700">
        {view === 0 && <div className="space-y-6"><KpiStrip {...p} /><div className="grid grid-cols-2 gap-6"><PaceWidget {...p} /><RiskWidget {...p} /></div></div>}
        {view === 1 && <div className="grid grid-cols-[1.5fr_1fr] gap-6"><FunnelWidget {...p} /><RankingWidget {...p} /></div>}
        {view === 2 && <div className="grid grid-cols-2 gap-6"><RiskWidget {...p} /><LossWidget {...p} /></div>}
      </div>
    </div>
  );
}
