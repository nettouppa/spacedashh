# Spacedash: o básico bem feito

Analisei a plataforma inteira (pelo código, sem testar ao vivo). O painel, o Atlas, as metas, o Modo TV e a conexão com o Bitrix24 funcionam. O que falta é o "feijão com arroz": menus que não levam a lugar nenhum, contas sem recuperação de senha, celular sem menu, erros que passam despercebidos e dados que só atualizam no clique.

## O que está inacabado hoje
- **Menu lateral**: "Pipeline", "Equipe" e "Relatórios" levam todos para a mesma tela do painel. "Configurações" não faz nada.
- **Topo**: a busca (⌘K) e o sino de notificações são só enfeite.
- **Integrações**: a lista de módulos mostra "Não sincronizado" em tudo, mesmo depois de sincronizar.
- **Painel**: enquanto carrega, ou quando dá erro, aparecem os dados de demonstração como se fossem reais.
- **Administração**: não dá para trocar o papel de alguém nem reenviar o convite. A lista de vendedores pode mostrar nomes de demonstração.
- **Celular/tablet**: o menu lateral some, e com ele o botão "Sair".
- **Avisos**: as mensagens de sucesso e de erro não aparecem, e salvar o layout diz "salvo" mesmo quando falha.
- **Páginas de erro** (página não encontrada etc.) estão em inglês.

## O que falta do básico
- Recuperar senha ("Esqueci minha senha").
- Página "Minha conta": nome, foto, troca de senha e empresa padrão.
- Atualização automática dos dados do Bitrix24 (hoje é só no botão).
- Estados claros de carregando, sem dados e erro em todas as telas.

## Plano em 4 etapas

### Etapa 1: nada quebrado nem enganoso
1. Ligar as mensagens de aviso (sucesso/erro) em todo o app.
2. Painel: mostrar "Carregando" e "Erro ao carregar, tentar de novo" em vez dos dados de demonstração. A demonstração só aparece quando o Bitrix24 não está conectado, com um aviso claro.
3. Salvar layout, metas e conversas: avisar quando falhar.
4. Integrações: mostrar o status real de cada módulo (quantidade de registros e data da última sincronização).
5. Páginas de erro e de "não encontrado" em português.
6. Topo: tirar o sino até existir a central de avisos; a busca vira uma busca de verdade (etapa 3).

### Etapa 2: menus que funcionam
1. **Pipeline**: abre o painel direto na aba "Comercial & Funil".
2. **Equipe**: página com a lista de vendedores e equipes vindos do Bitrix24, com receita, meta, atingimento e atividades de cada um. Ao clicar num vendedor, o painel abre já filtrado por ele.
3. **Relatórios**: página com relatórios prontos (Resumo do mês, Funil, Equipe, Atendimento). Cada um mostra a tabela, permite escolher o período e exportar em planilha (CSV) ou PDF.
4. **Configurações**: página com abas Empresa (Atlas, voz, personalidade, metas) e Minha conta. Hoje essas opções estão espalhadas.
5. Menu do celular: botão que abre o menu lateral como gaveta, incluindo "Sair".
6. O menu marca a página em que você está.

### Etapa 3: contas e administração
1. "Esqueci minha senha" na tela de entrada, com página para criar a nova senha.
2. Minha conta: nome, troca de senha, empresa padrão ao entrar.
3. Administração: trocar o papel (gestor/colaborador), reenviar o convite, vincular o membro a um vendedor real da empresa.
4. Histórico simples de ações administrativas (quem convidou, removeu ou mudou o papel, e quando).
5. Busca do topo (⌘K): ir para páginas, vendedores, negócios e perguntar ao Atlas.

### Etapa 4: dados sempre atualizados
1. Sincronização automática com o Bitrix24 a cada hora, além do botão manual.
2. Integrações mostra a próxima sincronização e o resultado das últimas.
3. Avisar no painel quando os dados estiverem desatualizados (mais de 24h) ou se a última sincronização falhou.
4. Remover o limite silencioso de registros carregados, ou avisar quando ele for atingido.

## Ordem sugerida
Etapas 1 e 2 primeiro, porque é o que o cliente vê. Depois a 3 e a 4. Posso fazer tudo em sequência, uma etapa por vez, e você valida no meio.

## Detalhes técnicos
- Montar `<Toaster />` (sonner) em `__root.tsx`; trocar os `catch {}` silenciosos por `toast.error`.
- `dashboard.tsx`: distinguir `isLoading` / `isError` / "não conectado" antes de `setDataset`; a demonstração só aparece com `bitrix_status` vazio.
- Novas rotas em `_authenticated/`: `team.tsx`, `reports.tsx`, `settings.tsx`, `account.tsx`; `/dashboard?view=comercial` para Pipeline. `app-shell` usa `Link` com estado ativo, mais um `Sheet` para o celular.
- Recuperação de senha: `resetPasswordForEmail` com retorno para a rota pública `/reset-password` (`updateUser`).
- Admin: server functions `updateMemberRole`, `resendInvite`, `seller_ref` a partir de `bitrix_users` da empresa. Nova tabela `admin_audit` (somente inserção pelas funções, leitura para admin/gestor).
- Sync automático: rota `/api/public/bitrix/cron` protegida por segredo, chamada a cada hora pelo agendador do backend; percorre `bitrix_connections` e chama `syncDeals`. Status por módulo vem da contagem nas tabelas sincronizadas.
- Paginar o carregamento além de 20 mil registros, ou mostrar um aviso quando o limite for atingido.
- Testes para as regras novas: permissão de troca de papel, quando os dados contam como desatualizados, exportação CSV.
