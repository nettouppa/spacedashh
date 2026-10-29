# Spacedashh

Desenvolver uma aplicação de inteligência de negócios e painel gerencial externo multi-empresa integrado ao Bitrix24 Cloud, com foco em CRM e Vendas.

Requisitos principais:
- Design e Experiência Visual: Inspirado fielmente nas imagens de referência anexadas (estilo soft neomorphic, cantos ultra-arredondados rounded-3xl, cartões brancos flutuantes com sombras suaves difusas, elementos de contraste em preto fosco/chumbo profundo e padrões de listras diagonais nas barras), substituindo o amarelo das referências por roxo/violeta vibrante como cor primária de destaque.
- Cards com Drag-and-Drop: Todos os widgets do dashboard são modulares, com arrastar e soltar (drag and drop) intuitivo e opção de reorganizar e salvar o layout.
- Cross-filtering interativo (estilo Google Looker Studio / Power BI): Ao clicar em qualquer dado (uma etapa do funil de vendas, uma barra de vendedor no ranking ou um motivo de perda), todo o restante do dashboard filtra e recalcula instantaneamente os indicadores para aquele contexto, exibindo chips de filtros ativos com opção de remoção.
- Modo TV (Wallboard): Botão dedicado para exibir o dashboard em tela cheia na televisão de salas comerciais, com tipografia e números ampliados, tema escuro de alto contraste, auto-refresh e rotação automática (carrossel) entre visões.
- Assistente de IA Integrado (Chat): Painel retrátil de IA para responder perguntas sobre os dados de vendas e aplicar ações e filtros no próprio dashboard sob demanda em linguagem natural.
- Indicadores de CRM & Vendas:
  * KPIs principais: Faturamento realizado vs. Meta do mês, Ticket Médio, Negócios Abertos e Taxa de Conversão.
  * Funil de vendas interativo por etapas com valores e taxas de passagem.
  * Ranking de executivos/vendedores com fotos, total vendido e barra de progresso em roxo.
  * Card escuro de destaque para Negócios Críticos / Em Risco (altos valores sem atividade recente).
  * Análise de motivos de perda e ritmo de fechamento semanal/mensal.
- Suporte a filtros globais por período, equipe e vendedor, além de simulação de alternância de perfil (Gestor Comercial vs. Vendedor individual).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://spacedashh.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8e043873-dc68-427b-b3da-5fbabb5f2cc2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
