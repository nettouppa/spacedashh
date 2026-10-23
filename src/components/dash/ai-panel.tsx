import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import { X, ArrowUp, Copy, RotateCw, Check, SquarePen, Filter, Undo2, TrendingUp, AlertTriangle, Target, Mic } from "lucide-react";

/* eslint-disable @typescript-eslint/no-explicit-any */
function useVoice(onPartial: (t: string) => void, onFinal: (t: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<any>(null);
  const cbs = useRef({ onPartial, onFinal });
  cbs.current = { onPartial, onFinal };
  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const r = new SR();
    r.lang = "pt-BR"; r.interimResults = true; r.continuous = false;
    let text = "";
    r.onstart = () => { text = ""; setListening(true); sfx.micOpen(); };
    r.onresult = (e: any) => { text = Array.from(e.results).map((x: any) => x[0].transcript).join(""); cbs.current.onPartial(text); };
    r.onend = () => { setListening(false); if (text.trim()) sfx.micClose(); else sfx.abort(); cbs.current.onFinal(text); };
    r.onerror = () => setListening(false);
    rec.current = r;
    return () => { r.abort(); };
  }, []);
  const toggle = () => { if (!rec.current) return; if (listening) rec.current.stop(); else { try { rec.current.start(); } catch { /* já ativo */ } } };
  return { supported, listening, toggle };
}
import { askAssistant, type AiAction } from "@/lib/ai.functions";
import { sfx, soundEnabled, setSoundEnabled } from "@/lib/atlas-sound";
import { atRisk, brl, funnel, kpis, lossReasons, pct, ranking, sellerName, COMPANIES, TEAMS, STAGES, LOSS_REASONS, PRESET_LABELS, periodLabel, NOW, type Filters } from "@/lib/crm-data";
import { cn } from "@/lib/utils";
import { AtlasIcon, type AtlasRequest } from "./atlas";
import { VoiceMode } from "./voice-mode";
import { ConversationList } from "./conversation-list";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listConversations, getConversation, saveConversation, updateConversation, deleteConversation } from "@/lib/conversations.functions";
import { titleFrom, highlights, followUps } from "@/lib/conversations";
import { History, ThumbsUp, ThumbsDown, Pencil, FileDown, ClipboardCopy } from "lucide-react";
import { AudioLines, Volume2, VolumeX } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string; rating?: "up" | "down" | undefined; topic?: string | undefined; action?: { label: string; prev?: Filters | undefined } | undefined };

function buildContext(f: Filters) {
  const k = kpis(f);
  return JSON.stringify({
    hoje: NOW.toISOString().slice(0, 10),
    filtrosAtivos: { ...f, funil: f.company, period: periodLabel(f.period) },
    opcoes: { funis: COMPANIES, equipes: TEAMS, etapas: STAGES, motivosPerda: LOSS_REASONS, vendedores: ranking({ period: f.period }).map((s) => ({ id: s.id, nome: s.name, equipe: s.team })) },
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
  if (a.from && a.to) parts.push(`Período: ${a.from.split("-").reverse().join("/")} – ${a.to.split("-").reverse().join("/")}`);
  else if (a.period) parts.push(`Período: ${PRESET_LABELS[a.period]}`);
  if (a.company) parts.push(`Funil: ${a.company}`);
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

export function AiPanel({ open, onClose, onToggle, f, onAction, request, onRestore, userName, companyId }: {
  companyId: string; open: boolean; onClose: () => void; onToggle: () => void; f: Filters; onAction: (a: AiAction) => void; request: AtlasRequest | null; onRestore: (f: Filters) => void; userName: string;
}) {
  const ask = useServerFn(askAssistant);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [topic, setTopic] = useState<string | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const rate = (i: number, v: "up" | "down") => { dirty.current = true; setMsgs((ms) => ms.map((x, j) => j === i ? { ...x, rating: x.rating === v ? undefined : v } : x)); };
  const transcript = () => msgs.map((m) => `${m.role === "user" ? "Você" : "Atlas"}: ${m.content}`).join("\n\n");
  function exportPdf() {
    const w = window.open("", "_blank");
    if (!w) return;
    const esc = (t: string) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
    w.document.write(`<html><head><title>Conversa com o Atlas</title><style>body{font-family:system-ui,sans-serif;max-width:720px;margin:40px auto;color:#111;line-height:1.5}h1{font-size:20px}.m{margin:16px 0;white-space:pre-wrap}.r{font-size:12px;font-weight:600;color:#6d28d9;text-transform:uppercase}</style></head><body><h1>Spacedash · Conversa com o Atlas</h1><p style="color:#666;font-size:12px">${new Date().toLocaleString("pt-BR")}</p>${msgs.map((m) => `<div class="m"><div class="r">${m.role === "user" ? "Você" : "Atlas"}</div>${esc(m.content)}</div>`).join("")}</body></html>`);
    w.document.close(); w.focus(); w.print();
  }
  const [copied, setCopied] = useState<number | null>(null);
  const [hello, setHello] = useState("Olá");
  const end = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); onToggle(); }
      else if (e.key === "Escape" && open && !voiceOpen && !historyOpen) onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });
  const [convId, setConvId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const dirty = useRef(false);
  const voiceUsed = useRef(false);
  const qc = useQueryClient();
  const listFn = useServerFn(listConversations);
  const getFn = useServerFn(getConversation);
  const saveFn = useServerFn(saveConversation);
  const updFn = useServerFn(updateConversation);
  const delFn = useServerFn(deleteConversation);
  const convQ = useQuery({ queryKey: ["atlas-convs", companyId], queryFn: () => listFn({ data: { companyId } }), enabled: !!companyId && open });
  const lastKey = `sd-atlas-last-${companyId}`;
  const refreshList = () => qc.invalidateQueries({ queryKey: ["atlas-convs", companyId] });
  async function openConv(id: string) {
    try {
      const c = await getFn({ data: { id } });
      dirty.current = false; voiceUsed.current = false;
      setMsgs(c.messages.map((m) => ({ role: m.role, content: m.content, topic: m.topic, action: m.action ? { label: m.action.label } : undefined, rating: m.rating })));
      setConvId(c.id); setTopic(null); setHistoryOpen(false);
      localStorage.setItem(lastKey, c.id);
    } catch { localStorage.removeItem(lastKey); }
  }
  function newConv() { dirty.current = false; voiceUsed.current = false; setMsgs([]); setTopic(null); setConvId(null); localStorage.removeItem(lastKey); }
  useEffect(() => {
    if (!companyId) return;
    const last = localStorage.getItem(lastKey);
    if (last) void openConv(last); else newConv();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);
  useEffect(() => {
    if (busy || !dirty.current || !msgs.length || !companyId) return;
    dirty.current = false;
    const payload = msgs.map((m) => ({ role: m.role, content: m.content, ...(m.topic ? { topic: m.topic } : {}), ...(m.action ? { action: { label: m.action.label } } : {}), ...(m.rating ? { rating: m.rating } : {}) }));
    const first = msgs.find((m) => m.role === "user");
    const mode = voiceUsed.current ? "voice" as const : "chat" as const;
    void saveFn({ data: { companyId, messages: payload, mode, ...(convId ? { id: convId } : { title: titleFrom(first?.content ?? "") }) } })
      .then((r) => { if (!convId) { setConvId(r.id); localStorage.setItem(lastKey, r.id); } void refreshList(); })
      .catch(() => { /* mantém a conversa na tela */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgs, busy]);
  const [sound, setSound] = useState(true);
  useEffect(() => { setSound(soundEnabled()); }, []);
  const wasOpen = useRef(false);
  useEffect(() => { if (open) sfx.dockIn(); else if (wasOpen.current) sfx.dockOut(); wasOpen.current = open; }, [open]);
  const fRef = useRef(f);
  fRef.current = f;
  useEffect(() => { setHello(greeting()); }, []);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  async function send(text: string, t: string | null = topic, cutAt?: number) {
    if (!text.trim() || busy) return;
    const content = t ? `Sobre o card "${t}": ${text}` : text;
    const base = cutAt === undefined ? msgs : msgs.slice(0, cutAt);
    const history = [...base, { role: "user" as const, content }];
    setMsgs([...base, { role: "user", content: text, topic: t ?? undefined }]);
    setEditIdx(null);
    setInput(""); setTopic(null); setBusy(true); sfx.transmit(); dirty.current = true;
    const prev = f;
    try {
      const r = await ask({ data: { messages: history.map(({ role, content }) => ({ role, content })).slice(-20), context: buildContext(f), companyId } });
      if (r.action) { onAction(r.action); sfx.action(); }
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
  const voice = useVoice((text) => setInput(text), (text) => { if (text.trim()) void send(text); });

  return (
    <aside className={cn("fixed inset-y-0 right-0 z-40 flex w-[min(400px,100vw)] flex-col border-l border-border bg-card text-card-foreground shadow-soft transition-transform duration-300 ease-out", open ? "translate-x-0" : "translate-x-[110%]")}>
      {voiceOpen && open && (
        <VoiceMode history={msgs.map(({ role, content }) => ({ role, content }))} companyId={companyId} context={() => buildContext(fRef.current)} onAction={onAction}
          onClose={(turns) => { setVoiceOpen(false); if (turns.length) { dirty.current = true; voiceUsed.current = true; setMsgs((m) => [...m, ...turns]); } }} />
      )}
      {historyOpen && open && (
        <ConversationList items={convQ.data ?? []} loading={convQ.isLoading} activeId={convId} onBack={() => setHistoryOpen(false)} onOpen={(id) => void openConv(id)}
          onRename={(id, title) => void updFn({ data: { id, title } }).then(refreshList)}
          onPin={(id, pinned) => void updFn({ data: { id, pinned } }).then(refreshList)}
          onDelete={(id) => void delFn({ data: { id } }).then(() => { if (id === convId) newConv(); return refreshList(); })} />
      )}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary", busy && "atlas-pulse")}><AtlasIcon className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-tight">Atlas</div>
          <div className="flex items-center gap-1.5 truncate text-xs text-muted-foreground"><span className="size-1.5 shrink-0 rounded-full bg-success" /><span className="truncate">{busy ? "Analisando seus dados…" : "Online · dados do Bitrix24"}</span></div>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={newConv} title="Nova conversa" aria-label="Nova conversa" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><SquarePen className="size-4" /></button>
          <button onClick={() => setHistoryOpen(true)} title="Conversas" aria-label="Conversas" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><History className="size-4" /></button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button title="Mais opções" aria-label="Mais opções" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><MoreHorizontal className="size-4" /></button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem disabled={!msgs.length} onSelect={() => { void navigator.clipboard.writeText(transcript()); }}><ClipboardCopy className="size-4" />Copiar conversa</DropdownMenuItem>
              <DropdownMenuItem disabled={!msgs.length} onSelect={exportPdf}><FileDown className="size-4" />Exportar PDF</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => { const n = !sound; setSoundEnabled(n); setSound(n); if (n) sfx.micOpen(); }}>
                {sound ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}{sound ? "Silenciar sons" : "Ativar sons"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="mx-1 h-5 w-px bg-border" />
          <button onClick={onClose} aria-label="Fechar" title="Fechar (Esc)" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-4" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-4 py-5">
        {msgs.length === 0 ? (
          <div className="atlas-in">
            <h2 className="text-xl font-semibold tracking-tight">{hello}, {userName}.</h2>
            <p className="mt-1 text-sm text-muted-foreground">Analisei o período {periodLabel(f.period, true).toLowerCase()}. Veja o que chamou minha atenção:</p>
            <div className="mt-4 space-y-2">
              {insights(f).map((it, i) => (
                <button key={it.title} onClick={() => send(it.q, null)} style={{ animationDelay: `${80 * (i + 1)}ms` }}
                  className="atlas-in group flex w-full items-start gap-3 rounded-lg border border-border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-primary-soft/40">
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
                {editIdx === i ? (
                  <form className="w-[85%]" onSubmit={(e) => { e.preventDefault(); void send(editText, m.topic ?? null, i); }}>
                    <textarea autoFocus rows={2} value={editText} onChange={(e) => setEditText(e.target.value)} className="block w-full resize-none rounded-xl border border-primary/40 bg-background px-3 py-2 text-sm outline-none" />
                    <div className="mt-1 flex justify-end gap-1 text-xs">
                      <button type="button" onClick={() => setEditIdx(null)} className="rounded px-2 py-1 text-muted-foreground hover:bg-muted">Cancelar</button>
                      <button disabled={!editText.trim() || busy} className="rounded bg-primary px-2 py-1 font-medium text-primary-foreground disabled:opacity-50">Enviar</button>
                    </div>
                  </form>
                ) : (
                  <div className="group/u flex items-start gap-1">
                    {i === msgs.map((x) => x.role).lastIndexOf("user") && !busy && <button onClick={() => { setEditIdx(i); setEditText(m.content); }} aria-label="Editar pergunta" title="Editar pergunta" className="mt-1.5 grid size-6 place-items-center rounded text-subtle-foreground opacity-0 transition hover:bg-muted hover:text-foreground group-hover/u:opacity-100"><Pencil className="size-3.5" /></button>}
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary-soft px-3.5 py-2 text-sm text-foreground">{m.content}</div>
                  </div>
                )}
              </div>
            ) : (
              <div key={i} className="atlas-in group flex gap-2.5">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><AtlasIcon className="size-3.5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm leading-relaxed tabular-nums [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 first:[&_p]:mt-0"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                  {highlights(m.content).length > 1 && (
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {highlights(m.content).map((h) => <div key={h} className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm font-semibold tabular-nums text-primary">{h}</div>)}
                    </div>
                  )}
                  {m.action && m.action.prev && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary-soft/50 px-3 py-2 text-xs">
                      <Filter className="size-3.5 text-primary" /><span className="flex-1 font-medium">{m.action.label}</span>
                      <button onClick={() => { sfx.revert(); onRestore(m.action!.prev!); setMsgs((ms) => ms.map((x, j) => j === i ? { ...x, action: undefined } : x)); }} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-primary hover:bg-card"><Undo2 className="size-3" />Desfazer</button>
                    </div>
                  )}
                  <div className={cn("mt-1.5 flex gap-1 transition group-hover:opacity-100", m.rating ? "opacity-100" : "opacity-0")}>
                    <button onClick={() => { void navigator.clipboard.writeText(m.content); setCopied(i); setTimeout(() => setCopied(null), 1500); }} aria-label="Copiar" className="grid size-6 place-items-center rounded text-subtle-foreground hover:bg-muted hover:text-foreground">{copied === i ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}</button>
                    <button onClick={() => { const u = lastUser(i); if (u) void send(u.content, u.topic ?? null); }} aria-label="Refazer" title="Gerar outra resposta" className="grid size-6 place-items-center rounded text-subtle-foreground hover:bg-muted hover:text-foreground"><RotateCw className="size-3.5" /></button>
                    <button onClick={() => rate(i, "up")} aria-label="Resposta útil" title="Útil" className={cn("grid size-6 place-items-center rounded hover:bg-muted", m.rating === "up" ? "text-success" : "text-subtle-foreground hover:text-foreground")}><ThumbsUp className="size-3.5" /></button>
                    <button onClick={() => rate(i, "down")} aria-label="Resposta não útil" title="Não útil" className={cn("grid size-6 place-items-center rounded hover:bg-muted", m.rating === "down" ? "text-danger" : "text-subtle-foreground hover:text-foreground")}><ThumbsDown className="size-3.5" /></button>
                  </div>
                </div>
              </div>
            ))}
            {!busy && msgs[msgs.length - 1]?.role === "assistant" && (
              <div className="atlas-in flex flex-wrap gap-1.5 pl-8">
                {followUps(msgs[msgs.length - 1]!.content).map((q) => <button key={q} onClick={() => send(q, null)} className="rounded-full border border-border px-3 py-1 text-[12px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground">{q}</button>)}
              </div>
            )}
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
            {voice.supported && (
              <button type="button" onClick={() => setVoiceOpen(true)} disabled={busy} aria-label="Conversar por voz" title="Conversar por voz"
                className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <AudioLines className="size-4" />
              </button>
            )}
            {voice.supported && (
              <button type="button" onClick={voice.toggle} disabled={busy} aria-label={voice.listening ? "Parar de ouvir" : "Falar com o Atlas"} title={voice.listening ? "Ouvindo… clique para parar" : "Falar com o Atlas"}
                className={cn("grid size-7 shrink-0 place-items-center rounded-lg transition", voice.listening ? "bg-danger-soft text-danger atlas-pulse" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                <Mic className="size-4" />
              </button>
            )}
            <button disabled={busy || !input.trim()} aria-label="Enviar" className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground transition disabled:bg-muted disabled:text-subtle-foreground"><ArrowUp className="size-4" /></button>
          </div>
        </form>
        <p className="mt-1.5 text-center text-[10px] text-subtle-foreground">Enter envia · Shift+Enter quebra linha · Ctrl+K abre/fecha · Esc fecha</p>
      </div>
    </aside>
  );
}
