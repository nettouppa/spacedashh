import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type Step = { id: string; label: string; done: boolean; action?: (() => void) | undefined; to?: string | undefined };

const KEY = "sd-onboarding-hidden";

/** Getting-started checklist shown to managers until every step is done or it's dismissed. */
export function Onboarding({ steps, companyId }: { steps: Step[]; companyId: string }) {
  const [hidden, setHidden] = useState(true);
  useEffect(() => { setHidden(localStorage.getItem(`${KEY}:${companyId}`) === "1"); }, [companyId]);
  const done = steps.filter((s) => s.done).length;
  if (hidden || done === steps.length) return null;
  const hide = () => { localStorage.setItem(`${KEY}:${companyId}`, "1"); setHidden(true); };
  return (
    <section className="mb-4 rounded-xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Primeiros passos no Spacedash</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{done} de {steps.length} concluídos · leva poucos minutos</p>
        </div>
        <button onClick={hide} aria-label="Ocultar" className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"><X className="size-4" /></button>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary transition-[width] duration-500" style={{ width: `${(done / steps.length) * 100}%` }} /></div>
      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((s, i) => {
          const body = (
            <>
              <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border text-[11px] font-semibold", s.done ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>{s.done ? <Check className="size-3" /> : i + 1}</span>
              <span className={cn("text-left", s.done && "text-muted-foreground line-through")}>{s.label}</span>
            </>
          );
          const cls = "flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-[13px] hover:border-primary/40 hover:bg-muted/40";
          return <li key={s.id}>{s.to ? <Link to={s.to} className={cls}>{body}</Link> : <button onClick={s.action} disabled={s.done} className={cls}>{body}</button>}</li>;
        })}
      </ol>
    </section>
  );
}
