export type ConvSummary = { id: string; title: string; pinned: boolean; mode: string; updated_at: string; preview: string };

/** Auto title from the first question, cut at ~60 chars on a word boundary. */
export function titleFrom(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "Nova conversa";
  if (t.length <= 60) return t;
  const cut = t.slice(0, 60);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 30 ? cut.slice(0, sp) : cut).trim()}…`;
}

export type Group = "Fixadas" | "Hoje" | "Ontem" | "Últimos 7 dias" | "Mais antigas";
export const GROUP_ORDER: Group[] = ["Fixadas", "Hoje", "Ontem", "Últimos 7 dias", "Mais antigas"];

export function groupOf(c: { pinned: boolean; updated_at: string }, now = new Date()): Group {
  if (c.pinned) return "Fixadas";
  const d = new Date(c.updated_at);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = d.getTime();
  if (t >= start) return "Hoje";
  if (t >= start - 86_400_000) return "Ontem";
  if (t >= start - 7 * 86_400_000) return "Últimos 7 dias";
  return "Mais antigas";
}

export function groupConversations<T extends { pinned: boolean; updated_at: string }>(list: T[], now = new Date()) {
  const out = new Map<Group, T[]>();
  for (const c of [...list].sort((a, b) => b.updated_at.localeCompare(a.updated_at))) {
    const g = groupOf(c, now);
    out.set(g, [...(out.get(g) ?? []), c]);
  }
  return GROUP_ORDER.filter((g) => out.has(g)).map((g) => ({ group: g, items: out.get(g)! }));
}

/** Bold numeric highlights in an Atlas reply (e.g. **R$ 120 mil**, **38%**), max 4. */
export function highlights(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\*\*([^*]{1,40})\*\*/g)) {
    const v = m[1]!.trim();
    if (/\d/.test(v) && !out.includes(v)) out.push(v);
    if (out.length === 4) break;
  }
  return out;
}

/** Follow-up questions based on what the reply talks about. */
export function followUps(reply: string): string[] {
  const t = reply.toLowerCase();
  const s: string[] = [];
  if (/meta|atingi/.test(t)) s.push("O que preciso para bater a meta?");
  if (/risco|parad|sem atividade/.test(t)) s.push("Quais negócios em risco priorizo hoje?");
  if (/funil|etapa|convers|passagem/.test(t)) s.push("Onde o funil está perdendo mais?");
  if (/vendedor|ranking|equipe/.test(t)) s.push("Quem precisa de ajuda na equipe?");
  if (/perd|motivo/.test(t)) s.push("Como reduzir as perdas?");
  for (const d of ["Compare com o período anterior", "Resuma em 3 pontos", "Qual a projeção de fechamento?"]) if (s.length < 3 && !s.includes(d)) s.push(d);
  return s.slice(0, 3);
}
