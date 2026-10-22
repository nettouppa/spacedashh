# Spacedash + Atlas em cada card

## O que muda
1. **Nome:** "Violeta Sales Hub" vira **Spacedash** na barra lateral, título da página, modo TV e nas instruções da IA.
2. **Copilot vira Atlas:** botão do topo, cabeçalho da barra lateral ("Atlas · seu copiloto de vendas") e saudação. Ícone próprio: cabeça de astronauta (capacete com visor), desenhado em traço fino no mesmo estilo dos demais ícones.
3. **Atlas em cada card:** ícone pequeno do Atlas no canto superior direito de todos os cards (KPIs, funil, ranking, riscos, perdas, ritmo). Ao passar o cursor abre um menu com:
   - **Explique-me** — abre o Atlas à direita e envia automaticamente "Explique o card X" com os dados daquele card e os filtros atuais.
   - **Pergunte-me** — abre o Atlas com o campo de pergunta já focado e um aviso "Sobre: X", para a pessoa digitar a dúvida sobre aquele card.
   - Clicar no próprio ícone também abre o Atlas (comportamento de "Pergunte-me").
4. O ícone fica escondido no modo Personalizar para não atrapalhar arrastar/redimensionar.

## Detalhes técnicos
- Novo `AtlasIcon` (SVG) em `src/components/dash/atlas-icon.tsx`.
- Contexto React `AtlasContext` fornecido em `index.tsx` com `explain(cardTitle)` / `ask(cardTitle)`; `Card` em `widgets.tsx` ganha prop `atlasTopic` e renderiza o gatilho com menu em hover (Popover/HoverCard).
- `AiPanel` recebe `pending: { mode: "explain" | "ask"; topic } | null`: em "explain" chama `send()` ao abrir; em "ask" foca o input e prefixa a pergunta com o tópico.
- Atualizar textos em `app-shell.tsx`, `tv-mode.tsx`, `ai.functions.ts` e `head()` de `index.tsx`.
