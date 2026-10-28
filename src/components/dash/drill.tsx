import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { filterDeals, brl, sellerName, type Filters, type Deal } from "@/lib/crm-data";
import { cn } from "@/lib/utils";

/** Counts smoothly from the previous value to the new one. */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current, t0 = performance.now(), dur = 600;
    if (start === value || matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(value); from.current = value; return; }
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min((t - t0) / dur, 1), e = 1 - (1 - p) ** 3;
      const v = start + (value - start) * e;
      setShown(v); from.current = v;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(shown)}</>;
}

export type DrillKind = "won" | "open" | "lost" | "all";
const TITLE: Record<DrillKind, string> = { won: "Negócios ganhos", open: "Negócios abertos", lost: "Negócios perdidos", all: "Todos os negócios" };

export function DrillSheet({ kind, f, onClose }: { kind: DrillKind | null; f: Filters; onClose: () => void }) {
  const list: Deal[] = kind ? filterDeals(f).filter((d) => kind === "all" || d.status === kind).sort((a, b) => b.value - a.value) : [];
  const total = list.reduce((s, d) => s + d.value, 0);
  return (
    <Sheet open={!!kind} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle>{kind ? TITLE[kind] : ""}</SheetTitle>
          <SheetDescription>{list.length} negócios · {brl(total)} · com os filtros atuais</SheetDescription>
        </SheetHeader>
        <ul className="flex-1 divide-y divide-border overflow-y-auto">
          {list.slice(0, 200).map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-5 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{d.title}</div>
                <div className="truncate text-xs text-muted-foreground">{sellerName(d.sellerId) ?? "Sem responsável"} · {d.stage}</div>
              </div>
              <span className={cn("shrink-0 tabular-nums font-semibold", d.status === "won" && "text-success", d.status === "lost" && "text-danger")}>{brl(d.value)}</span>
            </li>
          ))}
          {list.length === 0 && <li className="p-8 text-center text-sm text-muted-foreground">Nenhum negócio com esses filtros.</li>}
          {list.length > 200 && <li className="p-4 text-center text-xs text-muted-foreground">Mostrando os 200 maiores.</li>}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
