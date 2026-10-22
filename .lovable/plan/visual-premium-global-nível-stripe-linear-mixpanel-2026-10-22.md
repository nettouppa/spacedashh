# Visual premium global (nível Stripe / Linear / Mixpanel)

Objetivo: elevar o painel a um padrão de ferramenta SaaS premium internacional. Ele continua claro, legível, sem listras e sem caixas pretas. Todas as funções ficam iguais.

## Direção visual

- **Estrutura de app profissional**: barra lateral fixa à esquerda (logo, navegação: Visão geral, Pipeline, Equipe, Relatórios, Integrações · Bitrix24, Configurações) e uma barra superior fina com breadcrumb, busca (⌘K), seletor de empresa, período, perfil e avatar.
- **Paleta mais sóbria**: fundo off-white neutro, cards brancos com borda de 1px e quase sem sombra. Texto grafite com hierarquia em 3 níveis. O roxo fica restrito a ações e dados principais, e o resto é em tons neutros.
- **Tipografia refinada**: Inter com números tabulares; títulos médios (semibold, não extra-bold); rótulos pequenos em cinza; KPIs grandes e firmes. Sem marca-texto e sem pílulas em caixa alta espaçada.
- **Densidade de dados**: espaçamento em grid de 8px, cards mais compactos e alinhados e mais informação útil por tela.

## Componentes

- **KPIs**: 4 cards com rótulo, valor grande, variação vs. período anterior (seta verde/vermelha com %) e um mini-gráfico de tendência (sparkline).
- **Funil**: barras horizontais finas em roxo com opacidades, colunas alinhadas e taxa de passagem destacada entre etapas.
- **Ranking**: tabela limpa (posição, avatar, nome, equipe, vendido, % da meta com barra fina).
- **Negócios em risco**: tabela com indicador de status (ponto vermelho/âmbar), dias sem atividade, responsável e valor.
- **Ritmo de fechamento**: gráfico de área/linha suave com eixo e tooltip, comparando realizado com a meta.
- **Motivos de perda**: barras horizontais com valor e % do total.
- **Filtros ativos**: barra discreta de chips com borda abaixo do header.
- **Botões**: estilo "segmented control" para período e perfil; botão primário roxo sólido sem brilho; botões secundários com borda.
- **Assistente IA**: painel lateral no estilo "copilot", com sugestões em lista.
- **Modo TV**: grafite profundo com tipografia grande, barra de progresso da rotação e relógio.

## Detalhes técnicos

- Novo `src/components/dash/app-shell.tsx` (sidebar + topbar); `index.tsx` passa a usá-lo.
- `src/styles.css`: tokens neutros (fundo, borda, 3 níveis de texto), primário roxo refinado, success/danger/warning, sombras mínimas; remover `highlight`/`shadow-glow`.
- `widgets.tsx`: reescrever com sparklines e variação; adicionar `previousKpis` em `crm-data.ts` (período anterior) para calcular deltas.
- Gráfico de ritmo com `recharts` (instalar), com SSR seguro.
- Atualizar a memória de design: "SaaS premium global, sóbrio, claro; sem listras/caixas pretas".
