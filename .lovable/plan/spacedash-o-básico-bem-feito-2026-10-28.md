# Spacedash — o básico bem feito

## Diagnóstico
Todos os menus têm tela real (Visão geral, Pipeline, Equipe, Relatórios, Integrações, Configurações, Administração, Sair). Não há botões "em breve". Os problemas estão na confiabilidade dos dados e em itens básicos de conta e equipe.

### Falhas que comprometem os números
1. **Sincronização trava em 2.000 negócios**: "sincronize de novo para continuar" recomeça do zero. Portais maiores nunca ficam completos.
2. **Dados de demonstração aparecem misturados**: enquanto carrega ou se der erro, o painel e os relatórios mostram dados fictícios (e permitem exportar).
3. **Sem sincronização automática**: só atualiza ao clicar.
4. **Administração usa vendedores errados**: a lista para vincular um membro a um vendedor do CRM não vem da empresa selecionada.
5. **Indicadores estimados sem aviso**: motivo de perda (nome da etapa), meta sugerida e "parado há X dias" são aproximações e não estão sinalizados.

### Básico que falta
6. **Esqueci minha senha** na tela de login e tela para definir senha ao aceitar convite.
7. **Gestão de membros**: trocar papel (gestor/colaborador) e vendedor vinculado direto na linha; confirmação ao remover; mensagens de erro e carregamento.
8. **Convite para quem já tem conta** não recebe aviso; lista de convites pendentes.
9. **Status da sincronização visível** no topo do painel (atualizado há X, falhou, parcial) com aviso claro quando o webhook for revogado.
10. **Telas da Administração no celular** (tabelas cortam).

## Plano em 3 etapas

### Etapa 1 — Dados confiáveis (prioridade)
- Sincronização incremental e retomável: guarda onde parou, continua do ponto e depois só busca o que mudou (por data de modificação). Remove o limite prático de 2.000.
- Sincronização automática a cada hora para todas as empresas conectadas, com registro da última execução e erro.
- Remove dados de demonstração quando a empresa tem Bitrix24 conectado: carregamento mostra esqueleto, erro mostra mensagem com "Tentar de novo"; exportar fica bloqueado nesses casos. Demonstração só para empresa sem integração, com selo claro.
- Selos "estimado" nos indicadores aproximados, com explicação ao passar o mouse.

### Etapa 2 — Contas e equipe
- "Esqueci minha senha" + página de redefinição; página de primeiro acesso via convite.
- Administração: editar papel e vendedor na própria linha, vendedores carregados da empresa certa, confirmação ao remover, estados de erro/carregando, convites pendentes com reenviar/cancelar, layout responsivo.

### Etapa 3 — Acabamento
- Indicador de saúde da sincronização no topo, com link para Integrações.
- Revisão de estados vazios em todos os cards (sem vendas no período, sem tarefas etc.).
- Varredura final de navegação em celular e desktop, com testes automáticos das regras (permissões, retomada da sincronização, metas).

## Detalhes técnicos
- `bitrix_connections`: colunas `sync_cursor` (por entidade) e `last_full_sync_at`; filtro `>DATE_MODIFY` para incrementais; cada execução processa um lote e salva cursor, respeitando tempo do worker.
- Agendamento: rota `/api/public/cron/bitrix-sync` protegida por segredo compartilhado, chamada por agendamento horário do backend.
- `workspace.tsx`/`setDataset`: separar "sem integração" (demo) de "carregando/erro" (sem dados).
- Admin: buscar `bitrix_users` da empresa selecionada; server functions `updateMember`, `listInvites`, `resendInvite`.
- Auth: `resetPasswordForEmail` com redirect para `/reset-password` (rota pública).
