# Próximos passos do Spacedash

Hoje o painel está completo no visual: funil, ranking, negócios em risco, filtros cruzados, cards que você arrasta e redimensiona, Modo TV e o Atlas com chat e voz. Mas tudo roda com **dados de exemplo**. Para cumprir as premissas do projeto (vários clientes, integração com o Bitrix24, perfis Gestor/Vendedor), sugiro esta ordem:

## Fase 1 — Base real (prioridade)
1. **Ativar o Lovable Cloud** para guardar empresas, usuários, layouts e dados sincronizados.
2. **Login por convite e várias empresas:** sem cadastro aberto; você convida empresas e pessoas. Cada cliente vê só os próprios dados, e um usuário pode acessar mais de uma empresa (com seletor no topo).
3. **Perfis de verdade:** Gestor vê a equipe toda; o Vendedor só vê os próprios negócios. Isso substitui a troca de perfil simulada que existe hoje.
4. **Layout salvo por usuário:** a ordem e o tamanho dos cards ficam guardados na conta, e não só no navegador.

## Fase 2 — Integração com o Bitrix24
5. **Aplicativo Spacedash no Bitrix24:** o cliente instala pelo portal e autoriza; trazemos negócios, etapas, vendedores, motivos de perda e atividades.
6. **Sincronização automática** a cada poucos minutos, mais um botão "Sincronizar agora" e um aviso de "última atualização".
7. **Metas** cadastradas no Spacedash por vendedor e por mês, já que o Bitrix24 não tem um campo padrão para isso.

## Fase 3 — Completar o produto
8. **Atlas funcionando de ponta a ponta:** resolver o erro de acesso ao serviço de IA visto nos testes e validar o chat, as ações de filtro e a voz.
9. **Páginas do menu** que ainda são só ícones: Pipeline (lista de negócios com detalhes), Equipe (desempenho individual) e Relatórios (exportar em PDF ou Excel).
10. **Modo TV com link próprio:** um endereço para deixar fixo na televisão da sala, sem precisar fazer login toda vez.
11. **Alertas:** aviso quando um negócio grande ficar parado ou quando a meta estiver em risco.

## Decisões tomadas
- **Bitrix24:** o cliente instala o aplicativo Spacedash pelo próprio portal Bitrix24. A instalação cria a empresa no Spacedash automaticamente.
- **Acesso:** por enquanto só entram clientes convidados por você, com uma tela simples de administrador para convidar empresas e pessoas. A estrutura já fica pronta para, no futuro, abrir o cadastro e a venda com planos e pagamento, sem precisar refazer nada.

## O que vou precisar de você na Fase 2
- Criar o aplicativo no Bitrix24 Partner (ou em "Aplicativo local" do seu portal) e me passar o código do cliente e a chave secreta. Eu indico onde colar cada um.

## Detalhes técnicos
- Tabelas: empresas, membros (com papel gestor/vendedor), conexões Bitrix24, negócios, etapas, vendedores, metas e layouts. Acesso isolado por empresa com regras de segurança na base de dados.
- Sincronização por rota de servidor agendada que chama `crm.deal.list`, `crm.status.list` e `user.get`, guardando um cursor incremental.
- `src/lib/crm-data.ts` passa a ler os negócios da base; os widgets não mudam, porque continuam usando `filterDeals`.
