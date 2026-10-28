import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AtlasIcon } from "./atlas";

const STEPS = [
  { sel: "filters", title: "Filtre do seu jeito", body: "Escolha período, funil, equipe e vendedor. Clicar em gráficos também filtra. Ctrl+Z desfaz." },
  { sel: "kpis", title: "Números que contam a história", body: "Clique em qualquer número para ver os negócios por trás dele." },
  { sel: "views", title: "Painéis prontos", body: "Crie painéis a partir de modelos — Executivo, Pipeline, Saúde do CRM e mais." },
  { sel: "atlas", title: "Conheça o Atlas", body: "Seu copiloto. Pergunte por texto ou voz, ou use “Explique isso” em qualquer card. Atalho: A." },
  { sel: "search", title: "Tudo a um atalho", body: "Ctrl/⌘ + K abre a busca rápida. Copie o link da visão para compartilhar os mesmos filtros." },
];

type R = { top: number; left: number; width: number; height: number };

export function Tour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<R | null>(null);
  const steps = STEPS;
  const step = steps[i]!;

  useEffect(() => { if (open) setI(0); }, [open]);
  useLayoutEffect(() => {
    if (!open) return;
    const find = () => [...document.querySelectorAll<HTMLElement>(`[data-tour="${step.sel}"]`)].find((e) => e.offsetParent !== null);
    const el = find();
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const upd = () => { const b = el.getBoundingClientRect(); setRect({ top: b.top, left: b.left, width: b.width, height: b.height }); };
    const t = setTimeout(upd, 350); upd();
    window.addEventListener("resize", upd); window.addEventListener("scroll", upd, true);
    return () => { clearTimeout(t); window.removeEventListener("resize", upd); window.removeEventListener("scroll", upd, true); };
  }, [open, step.sel]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") setI((x) => Math.min(x + 1, steps.length - 1)); if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0)); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose, steps.length]);

  if (!open || typeof document === "undefined") return null;
  const pad = 6;
  const below = !rect || rect.top + rect.height + 200 < window.innerHeight;
  const cardTop = rect ? (below ? rect.top + rect.height + pad + 10 : Math.max(rect.top - pad - 190, 12)) : window.innerHeight / 2 - 90;
  const cardLeft = rect ? Math.min(Math.max(rect.left, 12), window.innerWidth - 332) : window.innerWidth / 2 - 160;
  const last = i === steps.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-label="Tour guiado">
      {rect
        ? <div className="pointer-events-none absolute rounded-lg ring-2 ring-primary transition-all duration-300" style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: "0 0 0 9999px color-mix(in oklch, var(--foreground) 45%, transparent)" }} />
        : <div className="absolute inset-0 bg-foreground/45" />}
      <div className="atlas-in absolute w-80 rounded-xl border border-border bg-card p-4 shadow-soft transition-all duration-300" style={{ top: cardTop, left: cardLeft }}>
        <div className="flex items-center gap-2 text-xs font-medium text-primary"><AtlasIcon className="size-4" />Passo {i + 1} de {steps.length}</div>
        <h4 className="mt-1.5 text-sm font-semibold">{step.title}</h4>
        <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{step.body}</p>
        <div className="mt-4 flex items-center gap-2">
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Pular tour</button>
          <div className="ml-auto flex gap-1.5">
            {i > 0 && <button onClick={() => setI(i - 1)} className="h-8 rounded-md border border-border px-3 text-[13px] font-medium hover:bg-muted">Voltar</button>}
            <button onClick={() => (last ? onClose() : setI(i + 1))} className="h-8 rounded-md bg-primary px-3 text-[13px] font-medium text-primary-foreground hover:bg-primary/90">{last ? "Começar" : "Próximo"}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
