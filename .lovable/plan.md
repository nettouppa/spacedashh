# Seletor de período com calendário (intervalo de datas)

Troca os botões "Mês / Trimestre / Ano" do topo do painel por um seletor de datas com calendário.

## Como vai funcionar
- Um botão mostra o período escolhido, por exemplo "01/10/2026 – 22/10/2026", com um ícone de calendário.
- Ao clicar, abre uma janela com:
  - **Atalhos à esquerda:** Semana, Mês, Trimestre, Semestre e Ano. Cada um vale para o período atual: esta semana, este mês e assim por diante. O atalho em uso fica destacado.
  - **Calendário de dois meses à direita:** dá para escolher qualquer intervalo, clicando no dia de início e depois no dia de fim.
- Ao escolher um atalho ou um intervalo, todo o painel se atualiza: indicadores, funil, ranking, metas, atividades, atendimento e Atlas.
- O período padrão continua sendo o mês atual.

## Como cada parte se adapta
- **Metas:** somam os meses dentro do período. Um intervalo que pega só parte de um mês conta a meta daquele mês proporcional aos dias.
- **Comparativo com o período anterior:** compara com um intervalo de mesmo tamanho logo antes do escolhido.
- **Ritmo de fechamento:** intervalos de até 2 meses aparecem por semana; intervalos maiores aparecem por mês.
- **Atlas:** entende pedidos como "mostre o semestre" ou "última semana" e mostra o período em texto, por exemplo "Semestre" ou "01/10 – 22/10".
- **Modo TV e link de TV:** seguem o período escolhido no painel. O link de TV continua mostrando o mês atual.

## Detalhes técnicos
- `Filters.period` deixa de ser um texto fixo e passa a ser `{ preset?: "week"|"month"|"quarter"|"semester"|"year"; from: Date; to: Date }`. Um helper `presetRange(preset)` calcula as datas a partir de `NOW`, e `periodLabel()` gera o texto.
- `crm-data.ts`: `periodStart` e `periodPrevRange` passam a usar `from`/`to`. `filterDeals`, `periodMonths`/`sellerGoal` (com rateio por dias), `pace`, `previousKpis` e os cálculos de atividades e atendimento também são ajustados.
- Novo `src/components/dash/date-range-picker.tsx` com o `Popover` e o `Calendar` do shadcn (`mode="range"`, `numberOfMonths={2}`, `pointer-events-auto`, idioma pt-BR via date-fns). Os atalhos ficam numa coluna lateral.
- `dashboard.tsx`: substitui o `Segmented` pelo novo seletor. O botão "Limpar tudo" e a troca de empresa mantêm o período atual.
- `ai.functions.ts`: a ferramenta passa a aceitar `preset` com os 5 valores, e opcionalmente `from`/`to` em ISO. Também são ajustados os rótulos em `ai-panel.tsx`, `widgets.tsx` e `tv.$token.tsx`.
- Os testes existentes que usam `period: "month"` passam a usar `presetRange("month")`. Novos testes cobrem o cálculo de cada atalho e o rateio de metas.
