# Painel do Atlas: gestão de conversas e melhorias

Hoje a conversa só existe enquanto a página está aberta: ao recarregar ou clicar em "Nova conversa", tudo se perde. O plano transforma o painel num espaço de trabalho com histórico.

## 1. Gestão de conversas
- **Histórico salvo na conta**: cada conversa fica salva por usuário e por empresa, e aparece em qualquer navegador.
- **Lista de conversas**: um botão no topo do painel abre a lista, agrupada por Hoje, Ontem, Últimos 7 dias e Mais antigas.
- **Título automático**: gerado a partir da primeira pergunta. Dá para renomear.
- **Busca** por palavra dentro das conversas.
- **Fixar** conversas importantes no topo.
- **Excluir** uma conversa, com confirmação.
- **Retomar**: ao reabrir o Atlas, volta na última conversa.
- **Conversas por voz** também entram no histórico, com um ícone de voz.

## 2. Melhorias na conversa
- **Respostas com gráfico/números destacados**: quando o Atlas citar KPIs, eles aparecem em mini-cartões.
- **Botões de avaliação** (útil / não útil) em cada resposta.
- **Regenerar resposta** e **editar a última pergunta**.
- **Sugestões de continuação**: 2 ou 3 próximas perguntas abaixo de cada resposta.
- **Atalhos**: Ctrl+K abre o Atlas; Esc fecha.

## 3. Compartilhar e exportar
- **Copiar conversa** como texto e **exportar** em PDF.

## Ordem sugerida
Primeiro a parte 1 (gestão de conversas). As partes 2 e 3 ficam para uma segunda etapa, se você aprovar.

## Detalhes técnicos
- Tabelas `atlas_conversations` (id, company_id, user_id, title, pinned, mode chat|voice, updated_at) e `atlas_messages` (conversation_id, role, content, action jsonb, topic, created_at), com RLS: só o dono, e só se for membro da empresa (`is_member`).
- Server functions em `src/lib/conversations.functions.ts`: listar, criar, renomear, fixar, excluir, adicionar mensagens.
- `ai-panel.tsx`: nova visão "Histórico" dentro do painel (lista + busca), salvamento após cada troca de mensagens, última conversa lembrada.
- Título: primeira pergunta cortada em ~60 caracteres (sem custo de IA).
- Testes para título automático e agrupamento por data.
