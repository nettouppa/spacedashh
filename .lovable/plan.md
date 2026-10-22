# Redesign: visual "Clean claro" com leitura fácil

Objetivo: manter todas as funções (filtros cruzados, arrastar cards, Modo TV, IA), trocando só o visual por um estilo limpo, claro e de alto contraste.

## O que muda

- **Fundo e cards**: fundo cinza bem claro e liso (sem degradês), cards brancos com borda fina e sombra discreta. Cantos arredondados mais moderados.
- **Sem caixas pretas**: o card "Negócios em risco", a barra de meta, o funil, os gráficos e o painel da IA deixam de ser pretos. Passam a ser brancos, com destaques em roxo e em vermelho suave para alertas de risco.
- **Sem listras**: todas as barras listradas viram cores sólidas (roxo forte, roxo claro, cinza claro). O texto nunca fica em cima de padrão.
- **Texto mais legível**:
  - Fonte com peso normal/semibold nos números, no lugar da fina.
  - Rótulos em cinza escuro (não cinza claro), tamanho mínimo de 13–14px.
  - Valores ficam ao lado das barras, não dentro delas.
- **KPIs**: quatro cards separados (Faturado vs. Meta com barra de progresso simples, Ticket médio, Negócios abertos, Conversão), cada um com título, número grande e uma linha de apoio.
- **Funil**: barras horizontais sólidas em tons de roxo, com etapa, valor, quantidade e taxa de passagem em colunas alinhadas.
- **Ranking**: foto, nome, valor e barra de progresso roxa sólida, em fundo branco.
- **Motivos de perda e ritmo**: gráficos de barras sólidas com rótulos legíveis e valores visíveis.
- **Filtros ativos**: chips roxo-claro com texto escuro, em destaque.
- **Modo TV**: continua escuro (próprio para TV), mas sem listras e com textos maiores e mais contrastados.

## Detalhes técnicos

- `src/styles.css`: nova paleta (fundo, borda, texto muted mais escuro, tom "danger-soft" para risco), remover os utilitários `stripes` e `bg-page` com degradê e suavizar `shadow-soft`.
- `src/components/dash/widgets.tsx`: reescrever o visual de cada widget sem `bg-ink`/`stripes`; KpiStrip vira uma grade de 4 cards.
- `src/components/dash/ai-panel.tsx`: painel branco com borda; mensagens do usuário em roxo, da IA em cinza claro.
- `src/routes/index.tsx`: header e controles com estilo claro; a lógica fica intacta.
- `src/components/dash/tv-mode.tsx`: só ajustes de tamanho e contraste.
- Salvar a preferência de design ("clean claro, sem listras, sem caixas pretas") na memória do projeto.
