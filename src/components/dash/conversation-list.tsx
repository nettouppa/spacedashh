import { useMemo, useState } from "react";
import { ArrowLeft, AudioLines, Check, MessageSquare, Pencil, Pin, PinOff, Search, Trash2, X } from "lucide-react";
import { groupConversations, type ConvSummary } from "@/lib/conversations";
import { cn } from "@/lib/utils";

export function ConversationList({ items, loading, activeId, onBack, onOpen, onRename, onPin, onDelete }: {
  items: ConvSummary[]; loading: boolean; activeId: string | null; onBack: () => void; onOpen: (id: string) => void;
  onRename: (id: string, title: string) => void; onPin: (id: string, pinned: boolean) => void; onDelete: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const groups = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? items.filter((c) => c.title.toLowerCase().includes(s) || c.preview.toLowerCase().includes(s)) : items;
    return groupConversations(list);
  }, [items, q]);

  return (
    <div className="atlas-in absolute inset-0 z-10 flex flex-col bg-card">
      <div className="flex items-center gap-2 border-b border-border px-3 py-3">
        <button onClick={onBack} aria-label="Voltar" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><ArrowLeft className="size-4" /></button>
        <span className="text-sm font-semibold">Conversas</span>
      </div>
      <div className="px-3 pt-3">
        <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 focus-within:border-primary/50">
          <Search className="size-4 text-subtle-foreground" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nas conversas…" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </label>
      </div>
      <div className="flex-1 overflow-auto px-2 py-3">
        {loading ? <p className="px-2 text-sm text-muted-foreground">Carregando…</p>
          : groups.length === 0 ? <p className="px-2 text-sm text-muted-foreground">{q ? "Nada encontrado." : "Nenhuma conversa salva ainda."}</p>
          : groups.map((g) => (
            <div key={g.group} className="mb-3">
              <div className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wider text-subtle-foreground">{g.group}</div>
              {g.items.map((c) => (
                <div key={c.id} className={cn("group flex items-center gap-2 rounded-md px-2 py-1.5", activeId === c.id ? "bg-primary-soft" : "hover:bg-muted")}>
                  {c.mode === "voice" ? <AudioLines className="size-3.5 shrink-0 text-primary" /> : <MessageSquare className="size-3.5 shrink-0 text-subtle-foreground" />}
                  {editing === c.id ? (
                    <form className="flex flex-1 items-center gap-1" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) onRename(c.id, draft.trim()); setEditing(null); }}>
                      <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={120} onKeyDown={(e) => { if (e.key === "Escape") setEditing(null); }}
                        className="min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-sm outline-none focus:border-primary/50" />
                      <button aria-label="Salvar nome" className="grid size-6 place-items-center rounded text-primary hover:bg-card"><Check className="size-3.5" /></button>
                    </form>
                  ) : confirm === c.id ? (
                    <div className="flex flex-1 items-center gap-1 text-xs">
                      <span className="flex-1 text-danger">Excluir esta conversa?</span>
                      <button onClick={() => { onDelete(c.id); setConfirm(null); }} className="rounded bg-danger px-2 py-0.5 font-medium text-primary-foreground">Excluir</button>
                      <button onClick={() => setConfirm(null)} aria-label="Cancelar" className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-card"><X className="size-3.5" /></button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => onOpen(c.id)} className="min-w-0 flex-1 truncate text-left text-sm">{c.title}</button>
                      <div className="flex gap-0.5 opacity-0 transition group-hover:opacity-100">
                        <button onClick={() => onPin(c.id, !c.pinned)} aria-label={c.pinned ? "Desafixar" : "Fixar"} title={c.pinned ? "Desafixar" : "Fixar"} className="grid size-6 place-items-center rounded text-subtle-foreground hover:bg-card hover:text-foreground">{c.pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}</button>
                        <button onClick={() => { setEditing(c.id); setDraft(c.title); }} aria-label="Renomear" title="Renomear" className="grid size-6 place-items-center rounded text-subtle-foreground hover:bg-card hover:text-foreground"><Pencil className="size-3.5" /></button>
                        <button onClick={() => setConfirm(c.id)} aria-label="Excluir" title="Excluir" className="grid size-6 place-items-center rounded text-subtle-foreground hover:bg-card hover:text-danger"><Trash2 className="size-3.5" /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
