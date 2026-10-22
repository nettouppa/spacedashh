import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import { X, ArrowUp, Copy, RotateCw, Check, SquarePen, Filter, Undo2, TrendingUp, AlertTriangle, Target } from "lucide-react";
import { askAssistant, type AiAction } from "@/lib/ai.functions";
import { atRisk, brl, funnel, kpis, lossReasons, pct, ranking, sellerName, COMPANIES, TEAMS, STAGES, LOSS_REASONS, type Filters } from "@/lib/crm-data";
import { cn } from "@/lib/utils";
import { AtlasIcon, type AtlasRequest } from "./atlas";

type Msg = { role: "user" | "assistant"; content: string; topic?: string | undefined; action?: { label: string; prev: Filters } | undefined };

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

function describe(a: AiAction): string {
  if (a.tvMode) return "Modo TV aberto";
  if (a.clear) return "Filtros limpos";
  const parts: string[] = [];
  if (a.period) parts.push(`Período: ${{ month: "Mês", quarter: "Trimestre", year: "Ano" }[a.period]}`);
  if (a.company) parts.push(`Empresa: ${a.company}`);
  if (a.team) parts.push(`Equipe: ${a.team}`);
  if (a.sellerId) parts.push(`Vendedor: ${sellerName(a.sellerId)}`);
  if (a.stage) parts.push(`Etapa: ${a.stage}`);
  if (a.lossReason) parts.push(`Perda: ${a.lossReason}`);
  return parts.length ? `Filtro aplicado · ${parts.join(" · ")}` : "Filtros atualizados";
}

function insights(f: Filters) {
  const k = kpis(f);
  const fn = funnel(f);
  let gap = fn[1];
  fn.forEach((s, i) => { if (i && gap && s.pass < gap.pass) gap = s; });
  const risk = atRisk(f);
  const riskVal = risk.reduce((a, d) => a + d.value, 0);
  return [
    { icon: Target, tone: k.goalPct >= 1 ? "text-success" : "text-primary", title: `Receita em ${pct(k.goalPct)} da meta`, sub: `${brl(k.revenue)} de ${brl(k.goal)}`, q: "Como está minha receita frente à meta e o que preciso para batê-la?" },
    { icon: TrendingUp, tone: "text-warning", title: `Gargalo: ${gap?.stage ?? "-"} ${pct(gap?.pass ?? 0)}`, sub: "Menor taxa de passagem do funil", q: `Por que a passagem para ${gap?.stage} está baixa e como melhorar?` },
    { icon: AlertTriangle, tone: "text-danger", title: `${risk.length} negócios em risco`, sub: `Somando ${brl(riskVal)} sem atividade`, q: "Quais negócios em risco devo priorizar hoje?" },
  ];
}

const GROUPS = [
  { l: "Analisar", items: ["Resumo do mês", "Quem está em risco?"] },
  { l: "Filtrar", items: ["Filtrar Enterprise", "Limpar filtros"] },
  { l: "Ações", items: ["Abrir modo TV"] },
];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export function AiPanel({ open, onClose, f, onAction, request, onRestore, userName }: {
  open: boolean; onClose: () => void; f: Filters; onAction: (a: AiAction) => void; request: AtlasRequest | null; onRestore: (f: Filters) => void; userName: string;
}) {
  const ask = useServerFn(askAssistant);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [topic, setTopic] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [hello, setHello] = useState("Olá");
  const end = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { setHello(greeting()); }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  async function send(text: string, t: string | null = topic) {
    if (!text.trim() || busy) return;
    const content = t ? `Sobre o card "${t}": ${text}` : text;
    const history = [...msgs, { role: "user" as const, content }];
    setMsgs((m) => [...m, { role: "user", content: text, topic: t ?? undefined }]);
    setInput(""); setTopic(null); setBusy(true);
    const prev = f;
    try {
      const r = await ask({ data: { messages: history.map(({ role, content }) => ({ role, content })).slice(-20), context: buildContext(f) } });
      if (r.action) onAction(r.action);
      setMsgs((m) => [...m, { role: "assistant", content: r.reply, action: r.action ? { label: describe(r.action), prev } : undefined }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Não consegui responder agora. Tente novamente em instantes." }]);
    } finally { setBusy(false); }
  }

  useEffect(() => {
    if (!request) return;
    if (request.mode === "explain") {
      void send("Explique este card: o que ele mostra, como interpretar os números atuais e o que merece atenção.", request.topic);
    } else {
      setTopic(request.topic);
      setTimeout(() => inputRef.current?.focus(), 320);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id]);

  const lastUser = (i: number) => { for (let j = i - 1; j >= 0; j--) if (msgs[j]?.role === "user") return msgs[j]!; return null; };
  const chips = [f.company, f.team, f.sellerId && sellerName(f.sellerId), f.stage, f.lossReason].filter(Boolean) as string[];

  return (
    <aside className={cn("fixed inset-y-0 right-0 z-40 flex w-[min(400px,100vw)] flex-col border-l border-border bg-card text-card-foreground shadow-soft transition-transform duration-300 ease-out", open ? "translate-x-0" : "translate-x-[110%]")}>
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className={cn("grid size-10 place-items-center rounded-xl bg-primary-soft text-primary", busy && "atlas-pulse")}><AtlasIcon className="size-6" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Atlas</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><span className="size-1.5 rounded-full bg-success" />{busy ? "Analisando seus dados…" : "Online · lendo seus dados do Bitrix24"}</div>
        </div>
        <button onClick={() => { setMsgs([]); setTopic(null); }} title="Nova conversa" aria-label="Nova conversa" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><SquarePen className="size-4" /></button>
        <button onClick={onClose} aria-label="Fechar" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-4" /></button>
      </div>

      <div className="flex-1 overflow-auto px-4 py-5">
        {msgs.length === 0 ? (
          <div className="atlas-in">
            <h2 className="text-xl font-semibold tracking-tight">{hello}, {userName}.</h2>
            <p className="mt-1 text-sm text-muted-foreground">Analisei seu {{ month: "mês", quarter: "trimestre", year: "ano" }[f.period]}. Veja o que chamou minha atenção:</p>
            <div className="mt-4 space-y-2">
              {insights(f).map((it, i) => (
                <button key={it.title} onClick={() => send(it.q, null)} style={{ animationDelay: `${80 * (i + 1)}ms` }}
                  className="atlas-in group flex w-full items-start gap-3 rounded-lg border border-border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary-soft/40">
                  <it.icon className={cn("mt-0.5 size-4 shrink-0", it.tone)} />
                  <div className="min-w-0 flex-1"><div className="text-sm font-medium tabular-nums">{it.title}</div><div className="text-xs text-muted-foreground tabular-nums">{it.sub}</div></div>
                  <span className="text-xs font-medium text-primary opacity-0 transition group-hover:opacity-100">Aprofundar →</span>
                </button>
              ))}
            </div>
            <div className="mt-6 space-y-3">
              {GROUPS.map((g) => (
                <div key={g.l}>
                  <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-subtle-foreground">{g.l}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {g.items.map((s) => <button key={s} onClick={() => send(s, null)} className="rounded-full border border-border px-3 py-1 text-[13px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground">{s}</button>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {msgs.map((m, i) => m.role === "user" ? (
              <div key={i} className="atlas-in flex flex-col items-end gap-1">
                {m.topic && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Sobre: {m.topic}</span>}
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary-soft px-3.5 py-2 text-sm text-foreground">{m.content}</div>
              </div>
            ) : (
              <div key={i} className="atlas-in group flex gap-2.5">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><AtlasIcon className="size-3.5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm leading-relaxed tabular-nums [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 first:[&_p]:mt-0"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                  {m.action && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary-soft/50 px-3 py-2 text-xs">
                      <Filter className="size-3.5 text-primary" /><span className="flex-1 font-medium">{m.action.label}</span>
                      <button onClick={() => { onRestore(m.action!.prev); setMsgs((ms) => ms.map((x, j) => j === i ? { ...x, action: undefined } : x)); }} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-primary hover:bg-card"><Undo2 className="size-3" />Desfazer</button>
                    </div>
                  )}
                  <div className="mt-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => { void navigator.clipboard.writeText(m.content); setCopied(i); setTimeout(() => setCopied(null), 1500); }} aria-label="Copiar" className="grid size-6 place-items-center rounded text-subtle-foreground hover:bg-muted hover:text-foreground">{copied === i ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}</button>
                    <button onClick={() => { const u = lastUser(i); if (u) void send(u.content, u.topic ?? null); }} aria-label="Refazer" className="grid size-6 place-items-center rounded text-subtle-foreground hover:bg-muted hover:text-foreground"><RotateCw className="size-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
            {busy && (
              <div className="atlas-in flex items-center gap-2.5 text-sm text-muted-foreground">
                <span className="grid size-6 place-items-center rounded-full bg-primary-soft text-primary atlas-pulse"><AtlasIcon className="size-3.5" /></span>
                Atlas está analisando
                <span className="flex gap-0.5">{[0, 1, 2].map((d) => <span key={d} className="atlas-dot size-1 rounded-full bg-primary" style={{ animationDelay: `${d * 150}ms` }} />)}</span>
              </div>
            )}
          </div>
        )}
        <div ref={end} />
      </div>

      <div className="border-t border-border p-3">
        <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="rounded-xl border border-border bg-background transition focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
          {topic && (
            <div className="flex px-3 pt-2.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft py-0.5 pl-2 pr-1 text-[11px] font-medium text-primary">
                Sobre: {topic}<button type="button" onClick={() => setTopic(null)} aria-label="Remover tópico" className="grid size-4 place-items-center rounded-full hover:bg-card"><X className="size-3" /></button>
              </span>
            </div>
          )}
          <textarea ref={inputRef} rows={2} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
            placeholder={topic ? `Pergunte sobre ${topic}…` : "Pergunte ao Atlas sobre suas vendas…"}
            className="block w-full resize-none bg-transparent px-3 pt-2.5 text-sm outline-none placeholder:text-muted-foreground" />
          <div className="flex items-center gap-2 px-2 pb-2">
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden text-[11px] text-subtle-foreground">
              {chips.length ? <>Usando filtros:{chips.map((c) => <span key={c} className="truncate rounded bg-muted px-1.5 py-0.5 text-muted-foreground">{c}</span>)}</> : "Atlas usa os filtros ativos do painel"}
            </div>
            <button disabled={busy || !input.trim()} aria-label="Enviar" className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground transition disabled:bg-muted disabled:text-subtle-foreground"><ArrowUp className="size-4" /></button>
          </div>
        </form>
        <p className="mt-1.5 text-center text-[10px] text-subtle-foreground">Enter envia · Shift+Enter quebra linha</p>
      </div>
    </aside>
  );
}
