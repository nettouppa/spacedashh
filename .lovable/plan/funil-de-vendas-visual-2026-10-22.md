# Funil de vendas visual

Trocar a tabela atual do card "Funil de vendas" por um funil desenhado de verdade. A largura de cada etapa acompanha os dados.

## Como vai ficar

```text
 ┌──────────────────────────────────────┐  Prospecção   206 · R$ 5,5 mi
  \                                    /      ↓ 76%
   ┌──────────────────────────────┐       Qualificação 157 · R$ 4,4 mi
    \                            /            ↓ 70%
     ┌──────────────────────┐             Proposta     110 · R$ 3,4 mi
      ...
          ┌──────┐                        Ganho         13 · R$ 350 mil
```

- **Formato de funil**: cada etapa é um trapézio centralizado. A largura é proporcional à quantidade de negócios da etapa, e as bordas se ligam suavemente à etapa seguinte. Cada etapa tem uma largura mínima para continuar legível.
- **Cores**: tons de violeta que escurecem do topo (claro) até "Ganho" (violeta forte). Sem listras e sem preto.
- **Dentro/ao lado de cada etapa**: nome, quantidade de negócios e valor total.
- **Entre as etapas**: um selo com a taxa de conversão da etapa anterior para a seguinte (ex.: "↓ 76%"). Fica verde quando está boa, âmbar quando média e vermelho quando baixa (abaixo de 40%).
- **Eficiência do funil**: um destaque no topo do card com a conversão total do topo ao fundo (Ganho ÷ Prospecção, ex.: "6,3%"), junto com o valor convertido e a etapa com maior perda ("maior gargalo: Negociação → Ganho").
- **Interação**: clicar numa etapa continua filtrando o painel inteiro. A etapa selecionada fica realçada e as outras ficam esmaecidas.
- **Modo TV**: o mesmo funil, maior.

## Detalhes técnicos

- Reescrever só `FunnelWidget` em `src/components/dash/widgets.tsx`, desenhando o funil em SVG responsivo (polígonos por etapa; largura = count / count do topo).
- `funnel()` em `crm-data.ts` já devolve count, value e pass; adicionar o cálculo da conversão total e do maior gargalo no componente.
- Os limites de cor das taxas (≥60% verde, 40–59% âmbar, abaixo de 40% vermelho) ficam numa constante.
