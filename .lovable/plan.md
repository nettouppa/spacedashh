# Redesign: visual "Clean claro" no estilo soueraldo.com

Objetivo: manter todas as funções (filtros cruzados, arrastar cards, Modo TV, IA) e trocar só o visual por um estilo limpo e claro, de alto contraste, inspirado em soueraldo.com.

## Linguagem visual (baseada na referência)

- **Fundo**: cinza quente bem claro e liso (tipo papel), sem degradês nem listras.
- **Texto**: grafite-azulado escuro (quase preto) com títulos em negrito forte. Fonte Inter (títulos bold, textos regular).
- **Cor principal**: roxo-ameixa/magenta (como o botão "Solicitar orçamento"), com um lilás-orquídea claro para destaques.
- **Destaque tipo marca-texto**: palavra-chave do título com um traço lilás por baixo (ex.: "Bem-vindo, **Gestor**").
- **Etiquetas**: pílulas suaves em CAIXA ALTA espaçada (ex.: "EM RISCO" em rosa claro com texto vermelho, "META" em lilás).
- **Botões**: roxo sólido, cantos levemente arredondados, com halo lilás suave.
- **Cards**: brancos com borda fina e sombra mínima, cantos arredondados moderados (~16px).

## O que muda no painel

- **Sem caixas pretas**: o card "Negócios em risco", o funil, os gráficos e o painel da IA passam a ser brancos. O risco ganha etiqueta e detalhes em vermelho-rosado.
- **Sem listras**: barras em cores sólidas (roxo, lilás, cinza claro). O texto nunca fica sobre padrões.
- **Legibilidade**: números em semibold/bold; rótulos em cinza escuro com no mínimo 13–14px; valores ao lado das barras, nunca dentro delas.
- **KPIs**: 4 cards separados (Faturado vs. Meta com barra de progresso simples, Ticket médio, Abertos, Conversão), cada um com etiqueta, número grande e linha de apoio.
- **Funil**: barras horizontais sólidas em degradê de tons de roxo por etapa, com etapa, valor, quantidade e taxa de passagem alinhados em colunas.
- **Ranking, Perdas e Ritmo**: barras sólidas em roxo/lilás com rótulos e valores sempre visíveis.
- **Filtros ativos**: chips lilás com texto escuro.
- **Modo TV**: continua escuro (grafite profundo) por ser para TV, sem listras, com roxo/lilás da nova paleta e textos maiores.

## Detalhes técnicos

- `src/styles.css`: nova paleta oklch (fundo quente ~#EAE8E6, texto ~#2A2438, primário ameixa ~#9B4A9E, lilás ~#D08BD8, danger-soft); remover `stripes` e o degradê de `bg-page`; utilitários `highlight` (traço marca-texto) e `shadow-glow` lilás. Raio base ~1rem.
- `src/routes/__root.tsx`: trocar a fonte Outfit por Inter.
- `src/components/dash/widgets.tsx`: reescrever o visual de cada widget sem `bg-ink`/`stripes`; KpiStrip vira uma grade de 4 cards.
- `src/components/dash/ai-panel.tsx`: painel branco com borda; mensagens do usuário em roxo e da IA em cinza claro.
- `src/routes/index.tsx`: header, filtros e botões no novo estilo; a lógica fica intacta.
- `src/components/dash/tv-mode.tsx`: ajustes de paleta, tamanho e contraste.
- Salvar a preferência de design na memória do projeto (claro, inspirado em soueraldo.com, sem listras, sem caixas pretas).
