import { useEffect, useMemo, useState } from "react";
import { X, Copy, Target } from "lucide-react";
import { NOW, SELLERS, brl, monthKey, monthlyGoal, hasCustomGoal, suggestedGoal } from "@/lib/crm-data";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const shift = (m: string, n: number) => { const [y, mo] = m.split("-").map(Number); return monthKey(new Date(Date.UTC(y!, mo! - 1 + n, 1))); };
const label = (m: string) => { const [y, mo] = m.split("-").map(Number); return `${MONTHS[mo! - 1]} ${y}`; };

export function GoalsDialog({ onClose, onSave }: { onClose: () => void; onSave: (month: string, goals: { sellerRef: string; amount: number }[]) => Promise<void> }) {
  const [month, setMonth] = useState(monthKey(NOW));
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const options = useMemo(() => Array.from({ length: 15 }, (_, i) => shift(monthKey(NOW), i - 3)), []);

  const fill = (m: string) => {
    const v: Record<string, string> = {};
    SELLERS.forEach((s) => { if (hasCustomGoal(s.id, m)) v[s.id] = String(monthlyGoal(s, m)); });
    return v;
  };
  useEffect(() => { setVals(fill(month)); setErr(null); }, [month]);

  const total = SELLERS.reduce((a, s) => a + (vals[s.id] ? Number(vals[s.id]) : suggestedGoal(s)), 0);
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const goals = Object.entries(vals).filter(([, v]) => v.trim() !== "" && !Number.isNaN(Number(v))).map(([sellerRef, v]) => ({ sellerRef, amount: Number(v) }));
      await onSave(month, goals);
      onClose();
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro ao salvar."); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-xl border border-border bg-card shadow-soft" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2"><Target className="size-4 text-primary" /><h2 className="text-base font-semibold">Metas de faturamento</h2></div>
          <button onClick={onClose} aria-label="Fechar" className="rounded-md p-1 hover:bg-muted"><X className="size-4" /></button>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
          <select aria-label="Mês" value={month} onChange={(e) => setMonth(e.target.value)} className="h-8 rounded-md border border-border bg-card px-2.5 text-[13px] font-medium">
            {options.map((m) => <option key={m} value={m}>{label(m)}</option>)}
          </select>
          <button onClick={() => setVals(fill(shift(month, -1)))} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-[13px] font-medium hover:bg-muted"><Copy className="size-3.5" />Copiar mês anterior</button>
          <span className="ml-auto text-xs text-muted-foreground">Total: <b className="tabular-nums text-foreground">{brl(total)}</b></span>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-2">
          <p className="py-2 text-xs text-muted-foreground">Campos vazios usam a sugestão (média histórica + 10%).</p>
          {SELLERS.map((s) => (
            <div key={s.id} className="flex items-center gap-3 border-b border-border py-2 last:border-0">
              <img src={s.photo} alt="" className="size-8 rounded-full object-cover" />
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{s.name}</div><div className="truncate text-xs text-muted-foreground">{s.team}</div></div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">R$</span>
                <input type="number" min={0} step={1000} inputMode="numeric" value={vals[s.id] ?? ""} placeholder={String(suggestedGoal(s))}
                  onChange={(e) => setVals((p) => ({ ...p, [s.id]: e.target.value }))}
                  className="h-8 w-32 rounded-md border border-border bg-card px-2 text-right text-sm tabular-nums outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          {err && <span className="mr-auto text-xs text-destructive">{err}</span>}
          <button onClick={onClose} className="h-8 rounded-md border border-border px-3 text-[13px] font-medium hover:bg-muted">Cancelar</button>
          <button onClick={save} disabled={busy} className="h-8 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground disabled:opacity-60">{busy ? "Salvando…" : "Salvar metas"}</button>
        </div>
      </div>
    </div>
  );
}
