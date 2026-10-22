# Atlas: uma experiência premium

## Abertura (estado vazio)
- Cabeçalho com avatar do Atlas (capacete) com um leve brilho violeta pulsando quando está pensando; abaixo "Atlas · online · lendo seus dados do Bitrix24".
- Tela de boas-vindas no lugar da primeira mensagem: saudação pelo nome e período ("Boa tarde, Gestor — veja seu mês"), e **3 insights automáticos** em cartões clicáveis, gerados dos dados atuais (ex.: "Receita em 86% da meta", "Gargalo: Negociação → Ganho 22%", "5 negócios em risco somando R$ X"). Clicar pede ao Atlas que aprofunde.
- Sugestões em chips agrupados (Analisar, Filtrar, Ações) em vez da lista de textos solta.

## Conversa
- Mensagens do Atlas sem balão cinza: texto limpo com o mini avatar ao lado, tipografia melhor para listas, negrito e números (tabulares).
- Mensagens do usuário em balão violeta suave (não sólido) — mais leve e legível.
- Quando o Atlas aplica um filtro, aparece um **cartão de ação** na conversa ("Filtro aplicado: Equipe Enterprise" com botão Desfazer).
- Indicador "Atlas está analisando…" com três pontos animados em vez do spinner.
- Ações em cada resposta: Copiar e Refazer pergunta.
- Mensagens vindas de um card mostram um selo "Sobre: Funil de vendas".

## Campo de pergunta
- Campo maior com várias linhas (Enter envia, Shift+Enter quebra linha), selo do contexto do card dentro do campo, botão enviar que fica ativo só com texto, dica "Atlas usa os filtros ativos" com os chips dos filtros atuais.
- Botão "Nova conversa" no cabeçalho para limpar.

## Movimento
- Entrada suave das mensagens (fade + subida) e do painel.

## Detalhes técnicos
- Tudo em `src/components/dash/ai-panel.tsx` (+ ícone em `atlas.tsx`); insights calculados localmente a partir de `kpis`, `funnel`, `atRisk` (sem chamada de IA para abrir).
- Mensagens ganham tipo opcional `action` para o cartão de filtro; "Desfazer" restaura os filtros anteriores via callback novo `onUndo(prevFilters)` em `index.tsx`.
- Tokens de cor existentes (primary, primary-soft, muted); keyframes novos em `styles.css`.
