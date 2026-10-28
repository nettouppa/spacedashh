# Spacedash — Experiência fluida e viciante

Lista priorizada de melhorias de UX, agrupada por área. Cada item é pequeno e entregável sozinho.

## 1. Menu e navegação
- Paleta de comandos (Ctrl/Cmd+K): buscar painéis, cards, vendedores, negócios e perguntar ao Atlas no mesmo campo.
- Atalhos de teclado visíveis (G+P painel, G+I integrações, A abre Atlas, T modo TV, ? lista de atalhos).
- Menu lateral com indicador do item ativo, tooltips no modo compacto e botão para recolher manualmente (lembrado por usuário).
- Seletor de empresa no topo do menu, com troca instantânea e logo/inicial da empresa.
- Rodapé do menu com avatar, perfil (gestor/colaborador) e status da sincronização sempre visível.

## 2. Primeiro uso (onboarding)
- Checklist de ativação: conectar Bitrix24, cadastrar metas, convidar time, criar primeiro painel, perguntar ao Atlas — com barra de progresso.
- Tour guiado curto (3–4 passos) apontando filtros, cards, Atlas e painéis.
- Estado vazio inteligente: enquanto importa, mostrar progresso real da importação em vez de zeros.

## 3. Painel e cards
- Carregamento com esqueletos no formato de cada card (sem "pulos" de layout).
- Números animados ao mudar filtro e variação vs. período anterior em todos os KPIs.
- Clicar em qualquer número abre o detalhe (lista de negócios com link direto para o Bitrix24).
- Chips de filtros ativos fixos no topo, com "limpar tudo" e desfazer (Ctrl+Z).
- Filtros e painel ativo refletidos na URL: link compartilhável abre exatamente a mesma visão.
- Menu "..." em cada card: expandir em tela cheia, exportar imagem/CSV, remover.
- Notificação discreta (toast) para cada ação: salvo, sincronizado, erro.

## 4. Atlas (copiloto)
- Resumo diário proativo ao abrir: "3 coisas que mudaram desde ontem".
- Respostas com mini-gráficos e cards clicáveis que aplicam filtros no painel.
- Perguntas de continuação sugeridas após cada resposta.
- "Explique isso" contextual: resposta já vem com o card destacado no painel.
- Histórico de conversas pesquisável e fixar respostas favoritas.
- Botão copiar/compartilhar resposta e feedback (útil / não útil).
- Atalho global para abrir o Atlas e falar por voz.

## 5. Hábito e engajamento ("viciante")
- Metas com celebração ao bater 100% (confete leve) e marcos de 50/75%.
- Ranking com destaque de evolução da semana ("subiu 2 posições").
- Alertas: negócio parado, meta em risco, tarefa atrasada — sino no topo com contador.
- Resumo semanal por e-mail com os principais números e link de volta ao painel.
- Para colaborador: tela "Meu dia" (minhas tarefas, negócios sem próxima atividade, minha meta).

## 6. Acabamento
- Revisão de microtextos (tom claro, em português, sem jargão).
- Transições suaves entre painéis e abertura do Atlas.
- Versão celular do painel (cards empilhados, filtros em gaveta).
- Acessibilidade: foco visível, contraste, navegação por teclado.

## Ordem sugerida de entrega
1. Paleta de comandos + atalhos + menu refinado
2. Esqueletos, números animados, filtros na URL, drill-down dos números
3. Atlas proativo + respostas visuais + continuações
4. Checklist de ativação + tour
5. Alertas, celebração de metas, "Meu dia"
6. Celular e acabamento

## Detalhes técnicos
- Paleta: shadcn `Command` (cmdk) montada no `AppShell`.
- Filtros na URL: `validateSearch` na rota do painel, substituindo o estado local `Filters`.
- Drill-down: Sheet lateral reutilizando `filterDeals`, link `https://<portal>/crm/deal/details/<id>/`.
- Alertas e resumo semanal: tabela de notificações + rota agendada; e-mail exige domínio configurado.
- Atlas proativo: nova chamada ao servidor com os KPIs atuais vs. anteriores.
