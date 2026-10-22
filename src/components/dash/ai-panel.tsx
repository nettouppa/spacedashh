import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { askAssistant, type AiAction } from "@/lib/ai.functions";
import { atRisk, brl, funnel, kpis, lossReasons, pct, ranking, COMPANIES, TEAMS, STAGES, LOSS_REASONS, type Filters } from "@/lib/crm-data";

type Msg = { role: "user" | "assistant"; content: string };

function buildContext(f: Filters) {
  const k = kpis(f);
  return JSON.stringify({
    filtrosAtivos: f,
    opcoes: { empresas: COMPANIES, equipes: TEAMS, etapas: STAGES, motivosPerda: LOSS_REASONS, vendedores: ranking({ period: f.period }).map((s) => ({ id: s.id, nome: s.name, equipe: s.team })) },
    kpis: { faturado: brl(k.revenue, false), meta: brl(k.goal, false), atingimento: pct(k.goalPct), ticketMedio: brl(k.ticket, false), abertos: k.openCount, conversao: pct(k.conversion) },
    funil: funnel(f).map((s) => ({ etapa: s.stage, qtd: s.count, valor: brl(s.value, false), passagem: pct(s.pass) })),
    ranking: ranking(f).map((s) => ({ nome: s.name, total: brl(s.total, false) })),
    emRisco: atRisk(f).slice(0, 10).map((d) => ({ negocio: d.title, valor: brl(d.value, false), diasSemAtividade: d.lastActivityDays })),
    perdas: lossReasons(f),
  });
}

export function AiPanel({ open, onClose, f, onAction }: { open: boolean; onClose: () => void; f: Filters; onAction: (a: AiAction) => void }) {
  const ask = useServerFn(askAssistant);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: "Olá! Pergunte sobre suas vendas ou peça: *“mostre só a equipe Enterprise”*, *“quem está em risco?”*, *“abra o modo TV”*." }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ behavior: "smooth" }), [msgs]);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next); setInput(""); setBusy(true);
    try {
      const r = await ask({ data: { messages: next.slice(1).slice(-20), context: buildContext(f) } });
      if (r.action) onAction(r.action);
      setMsgs((m) => [...m, { role: "assistant", content: r.reply }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Não consegui responder agora." }]);
    } finally { setBusy(false); }
  }

  return (
    <aside className={`fixed inset-y-0 right-0 z-40 flex w-[min(400px,100vw)] flex-col border-l border-border bg-card text-card-foreground shadow-soft transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-[110%]"}`}>
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground"><Sparkles className="size-4" /></span><div><div className="font-bold">Copilot de vendas</div><div className="text-xs text-muted-foreground">IA sobre seus dados de CRM</div></div></div>
        <button onClick={onClose} aria-label="Fechar" className="grid size-9 place-items-center rounded-full bg-muted"><X className="size-4" /></button>
      </div>
      <div className="flex-1 space-y-3 overflow-auto px-5 py-4">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-8 rounded-xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground" : "mr-6 rounded-xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm"}>
            <div className="max-w-none [&_p]:my-1"><ReactMarkdown>{m.content}</ReactMarkdown></div>
          </div>
        ))}
        {busy && <Loader2 className="size-4 animate-spin opacity-60" />}
        <div ref={end} />
      </div>
      <div className="space-y-1 border-t border-border px-5 pt-3">
        {["Resumo do mês", "Quem está em risco?", "Filtrar Enterprise", "Limpar filtros"].map((s) => (
          <button key={s} onClick={() => send(s)} className="block w-full rounded-md px-2 py-1.5 text-left text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground">{s}</button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="m-4 flex items-center gap-2 rounded-lg border border-border bg-background p-1.5 pl-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pergunte algo…" className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        <button disabled={busy} className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground"><Send className="size-4" /></button>
      </form>
    </aside>
  );
}
