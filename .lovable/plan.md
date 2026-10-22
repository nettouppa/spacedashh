# Funil de vendas como peça central do painel

## Objetivo
Redesenhar o funil para ser o destaque visual do painel: bonito, claro de ler e fiel aos dados, no estilo premium sóbrio já definido (fundo claro, cartões brancos, violeta só em dados-chave, sem listras nem caixas pretas).

## Nova estrutura do cartão (largura total, topo do painel)

```text
+--------------------------------------------------------------------------+
| Funil de vendas                                   [Qtd | Valor]          |
| Eficiência topo→fundo 3,1%   Valor convertido R$ 412 mil   Gargalo: X    |
+--------------------------------------------------------------------------+
|  Prospecção     ███████████████████████████████   420   R$ 9,8 mi        |
|                         ↓ 76%                                            |
|  Qualificação     ██████████████████████████       319   R$ 7,4 mi        |
|                         ↓ 58%                                            |
|  Proposta           ███████████████                185   R$ 4,3 mi        |
|  ...                                                                      |
|  Ganho                   ██                         13   R$ 412 mil       |
+--------------------------------------------------------------------------+
```

- Funil simétrico e centralizado de verdade (SVG), com faixas que se afunilam suavemente de uma etapa para a próxima — forma contínua, sem degraus nem "meio funil".
- Largura de cada faixa estritamente proporcional à quantidade (ou ao valor, conforme o seletor Qtd/Valor).
- Degradê de violeta claro (topo) a violeta forte (fundo); etapa selecionada destacada, demais esmaecidas levemente.
- Nome da etapa, quantidade absoluta e valor financeiro aparecem em cima de cada faixa do funil (centralizados, em texto legível com bom contraste sobre o violeta).
- Taxa de conversão entre etapas como pílula centralizada no espaço entre uma faixa e a seguinte, com cor por desempenho (verde / âmbar / vermelho).
- Faixa de resumo no topo com 3 indicadores grandes: eficiência topo→fundo, valor convertido e maior gargalo (etapa com pior passagem, em vermelho).
- Passar o mouse mostra detalhes (ticket médio da etapa, % do total); clicar continua filtrando o painel inteiro.
- Cartão posicionado primeiro e em largura total, com mais altura que os demais.

## Detalhes técnicos
- Reescrever `FunnelWidget` em `src/components/dash/widgets.tsx` usando um único `<svg>` com `path` por etapa (trapézios cujas bordas superior/inferior usam a largura da etapa atual e da seguinte; a última usa a própria largura), `viewBox` responsivo; rótulos e números em grid HTML ao redor do SVG para nitidez.
- Estado local `metric: "count" | "value"` para o seletor.
- Cores via `color-mix(in oklab, var(--primary) X%, var(--card))`; badges com tokens success/warning/danger-soft.
- Registry: `funnel` com `span: "lg:col-span-3"` (largura total); bump da chave de layout para `vsh-layout-v3` para aplicar a nova ordem.
- Modo TV reutiliza o mesmo componente com `big`.
