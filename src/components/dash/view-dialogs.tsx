import { useEffect, useState } from "react";
import { Briefcase, Filter, HeartPulse, Trophy, Headphones, Plus, Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TEMPLATES, type Template } from "@/lib/views";
import { WIDGETS, type WidgetId } from "./widgets";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Briefcase> = { executivo: Briefcase, pipeline: Filter, higiene: HeartPulse, time: Trophy, atendimento: Headphones };

/** Miniature of the 12-col grid so users see the shape before choosing. */
function Preview({ t }: { t: Template }) {
  return (
    <div className="grid grid-cols-12 gap-1 rounded-md bg-muted/60 p-1.5">
      <div className="col-span-12 h-2 rounded-sm bg-primary/25" />
      {t.order.map((id) => <div key={id} style={{ gridColumn: `span ${t.sizes[id] ?? 4}` }} className="h-5 rounded-sm border border-border bg-card" />)}
    </div>
  );
}

export function NewViewDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (o: boolean) => void; onCreate: (name: string, t: Template | null) => void }) {
  const [pick, setPick] = useState<string>("executivo");
  const [name, setName] = useState("");
  useEffect(() => { if (open) { setPick("executivo"); setName(""); } }, [open]);
  const t = TEMPLATES.find((x) => x.id === pick) ?? null;
  const finalName = name.trim() || t?.name || "Meu painel";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Novo painel</DialogTitle>
          <DialogDescription>Comece por um modelo pronto — você pode ajustar os cards depois.</DialogDescription>
        </DialogHeader>
        <div className="grid max-h-[55vh] gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((x) => {
            const Icon = ICONS[x.id] ?? Briefcase; const on = pick === x.id;
            return (
              <button key={x.id} onClick={() => setPick(x.id)} onDoubleClick={() => onCreate(name.trim() || x.name, x)}
                className={cn("relative flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/50", on ? "border-primary ring-2 ring-primary/20" : "border-border")}>
                {on && <span className="absolute right-3 top-3 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-3" /></span>}
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary"><Icon className="size-4" /></span>
                  <div><div className="text-sm font-semibold">{x.name}</div><div className="text-[11px] text-muted-foreground">{x.audience}</div></div>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{x.description}</p>
                <Preview t={x} />
                <div className="flex flex-wrap gap-1">{x.order.map((id) => <span key={id} className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">{WIDGETS[id as WidgetId]?.title ?? id}</span>)}</div>
              </button>
            );
          })}
          <button onClick={() => setPick("blank")}
            className={cn("flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-center transition-all hover:border-primary/50", pick === "blank" ? "border-primary ring-2 ring-primary/20" : "border-border")}>
            <span className="grid size-8 place-items-center rounded-lg bg-muted"><Plus className="size-4" /></span>
            <div className="text-sm font-semibold">Em branco</div>
            <p className="text-xs text-muted-foreground">Monte do zero escolhendo os cards.</p>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="view-name">Nome</label>
          <Input id="view-name" value={name} maxLength={60} placeholder={t?.name ?? "Meu painel"} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onCreate(finalName, t); }} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onCreate(finalName, t)}>{t ? "Usar modelo" : "Criar painel"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RenameViewDialog({ current, onClose, onSave }: { current: string | null; onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState("");
  useEffect(() => { if (current !== null) setName(current); }, [current]);
  const ok = name.trim().length > 0;
  return (
    <Dialog open={current !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Renomear painel</DialogTitle></DialogHeader>
        <Input autoFocus value={name} maxLength={60} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && ok) onSave(name.trim()); }} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!ok} onClick={() => onSave(name.trim())}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteViewDialog({ name, onClose, onConfirm }: { name: string | null; onClose: () => void; onConfirm: () => void }) {
  return (
    <Dialog open={name !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir “{name}”?</DialogTitle>
          <DialogDescription>O painel some apenas da sua conta. Os dados do Bitrix24 não são afetados.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm}>Excluir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
