# Próximos passos do Spacedash

Hoje temos um painel de Vendas/CRM completo no visual, mas com **dados de exemplo**. Abaixo está o caminho para cumprir os 5 requisitos mínimos, a integração por aplicativo do Bitrix24 e o acesso por convite.

## Como cada requisito será atendido

| Requisito | Situação hoje | O que falta |
|---|---|---|
| Dashboards personalizados com indicadores de vários módulos | Um painel fixo de vendas; dá para mover e redimensionar os cards | Criar vários painéis, escolher os cards numa biblioteca e salvar na conta |
| Vendas, funil, atividades, tarefas e atendimento | Só vendas e funil | Novos módulos: Atividades, Tarefas e Atendimento |
| Filtros por período, equipe, responsável e outros | Período, empresa, equipe e vendedor | Período personalizado (datas), filtros por módulo e filtros salvos por painel |
| Gráficos, comparativos e evolução | Variação contra o período anterior, mini gráficos e ritmo de vendas | Gráficos de evolução mês a mês, comparar períodos e comparar equipes |
| Permissões: Gestor x Colaborador | Troca de perfil simulada | Perfis reais: o colaborador vê só os próprios dados |

## Fase 1: Base real
1. **Ativar o Lovable Cloud** para guardar empresas, usuários, painéis e dados sincronizados.
2. **Login por convite e várias empresas:** você convida empresas e pessoas, e cada empresa vê só os próprios dados. A estrutura já fica pronta para abrir a venda no futuro.
3. **Perfis e permissões:** Administrador (você), Gestor (vê a equipe toda) e Colaborador (vê só o que é dele). Isso vale para todos os módulos e também para o Atlas.

## Fase 2: Integração com o Bitrix24 (aplicativo pelo portal)
4. **Aplicativo Spacedash no Bitrix24:** o cliente instala pelo portal e autoriza, e a empresa é criada no Spacedash automaticamente.
5. **Dados trazidos do Bitrix24:**
   - Vendas: negócios, etapas, motivos de perda
   - Atividades: ligações, e-mails e reuniões por responsável
   - Tarefas: abertas, concluídas, atrasadas e prazos
   - Atendimento: conversas dos canais abertos, tempo de resposta e avaliação
   - Pessoas e departamentos, para montar equipes e permissões
6. **Sincronização automática** a cada poucos minutos, mais um botão "Sincronizar agora" e um aviso de "última atualização".

## Fase 3: Novos módulos e painéis personalizados
7. **Biblioteca de cards** com indicadores de todos os módulos (Vendas, Atividades, Tarefas, Atendimento).
8. **Meus painéis:** criar, renomear, duplicar e compartilhar painéis com a equipe. O Gestor pode publicar um painel padrão para os colaboradores.
9. **Novos cards:**
   - Atividades por pessoa e por tipo
   - Tarefas atrasadas e cumprimento de prazo
   - Atendimento: volume, tempo de resposta e satisfação
   - Evolução mensal e comparação de períodos
10. **Filtros completos:** período com datas livres, responsável, equipe, departamento e filtros próprios de cada módulo, mantendo a filtragem cruzada.

## Fase 4: Acabamento
11. **Atlas funcionando de ponta a ponta:** resolver o erro de acesso ao serviço de IA visto nos testes. O Atlas também passa a entender os novos módulos e a respeitar as permissões.
12. **Modo TV com link próprio** para deixar fixo na televisão, sem precisar fazer login toda vez.
13. **Relatórios:** exportar em PDF ou Excel.
14. **Metas** por pessoa e por mês, cadastradas no Spacedash.

## O que vou precisar de você
- Na Fase 2: criar o aplicativo (Bitrix24 Partner ou "Aplicativo local" no seu portal) e me passar o código do cliente e a chave secreta. Eu indico onde colar cada um.

## Detalhes técnicos
- Tabelas isoladas por empresa: empresas, membros, papéis (tabela separada de papéis, com função de verificação), conexões Bitrix24, negócios, atividades, tarefas, atendimentos, usuários e departamentos, painéis e metas. As regras de segurança na base de dados garantem o isolamento entre empresas e a visão do colaborador.
- Instalação e autorização do aplicativo por rota pública que valida a assinatura do Bitrix24 e guarda os tokens de acesso e renovação.
- Sincronização incremental agendada com `crm.deal.list`, `crm.activity.list`, `tasks.task.list`, `imopenlines.*`, `user.get` e `department.get`.
- Os widgets continuam usando funções de filtro (`filterDeals` e equivalentes por módulo); o arquivo de dados de exemplo é substituído pela leitura da base.
- Painéis guardados como lista de cards com tamanho, ordem e filtros.
