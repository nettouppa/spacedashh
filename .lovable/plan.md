# Fase 2 — Conexão multiempresa com o Bitrix24

## Decisão confirmada
O Spacedash terá um **aplicativo distribuível**, instalado e autorizado no portal de cada cliente. Você ainda não criou esse aplicativo. Um aplicativo local não atende à instalação por várias empresas.

O acesso ao Spacedash continua **somente por convite**. A instalação não libera automaticamente uma conta nem permite escolher outra empresa sem autorização.

## 1. Preparar a instalação
- Criar a página **Integrações → Bitrix24**, com a empresa selecionada, portal conectado, situação da conexão e última atualização real.
- Gestores autorizados e o administrador podem conectar e sincronizar; colaboradores não podem administrar a conexão.
- Preparar os endereços de instalação e autorização e apresentá-los para você cadastrar no aplicativo.
- Remover os avisos fictícios de “Sincronizado há 2 min”; enquanto não houver conexão, identificar claramente os dados de demonstração.

## 2. Cadastrar o aplicativo com sua participação
No ambiente de parceiros/desenvolvedores do Bitrix24, criar um aplicativo distribuível chamado **Spacedash**, não um aplicativo local.

- Cadastrar os endereços de instalação e autorização fornecidos na etapa anterior.
- Habilitar apenas os acessos necessários a CRM, atividades, tarefas, atendimento, usuários e departamentos, verificando os acessos exigidos pelos métodos utilizados.
- Obter o código do cliente e a chave secreta. Solicitar esses valores por **formulário seguro**, nunca pelo chat.
- Confirmar com o Bitrix24 o procedimento de distribuição e eventual revisão do aplicativo para clientes convidados. Não prometer instalação em vários portais antes dessa liberação.

Referências oficiais: [aplicativos distribuíveis](https://apidocs.bitrix24.com/settings/app-installation/mass-market-apps/index.html) e [autorização OAuth](https://apidocs.bitrix24.com/settings/oauth/index.html).

## 3. Conectar cada empresa com segurança
- O gestor inicia a conexão para uma empresa à qual tem acesso.
- Validar a autorização recebida do Bitrix24 e vincular a identidade do portal à empresa correta, sem confiar apenas no domínio informado.
- Guardar e renovar credenciais exclusivamente no servidor; nenhuma chave ou token aparece nos cards, no Atlas ou no navegador.
- Impedir que uma instalação substitua a conexão de outra empresa e exigir confirmação para reconectar.

## 4. Trazer os dados reais
Sincronizar em etapas: **pessoas e departamentos → etapas e negócios → atividades → tarefas → atendimento**.

- Paginar os resultados, respeitar os limites do Bitrix24 e continuar de onde a sincronização parou.
- Registrar resultado e atualização por módulo. A falta de acesso ao atendimento, por exemplo, não impede a atualização de vendas.
- Tratar registros alterados, removidos e acessos revogados; não apresentar dados antigos como atualizados.
- Exibir os negócios e pessoas reais no painel comercial, mantendo os filtros e o funil existentes. Os novos cards dos demais módulos permanecem na Fase 3.
- Vincular colaboradores aos responsáveis reais do Bitrix24 e aplicar a restrição no acesso aos dados, inclusive no Atlas; nunca escolher um vendedor padrão quando o vínculo estiver ausente.

## 5. Atualização automática e manual
- Botão **Sincronizar agora**, com andamento, sucesso e erro visíveis.
- Atualização automática em pequenas etapas, com prevenção de execuções simultâneas e renovação dos tokens.
- Mostrar a última sincronização concluída de verdade e avisar quando a conexão precisar de nova autorização.

## Validação antes de concluir
- Instalar em um portal real, autorizar e conferir negócios conhecidos no funil.
- Confirmar que uma segunda empresa não lê os dados da primeira e que um colaborador só lê seus próprios registros.
- Testar paginação, renovação de tokens, falhas por módulo e atualização manual/automática.
- Sem aplicativo e credenciais, concluir apenas a preparação; informar explicitamente o que ainda não foi validado.

## Detalhes técnicos
- TanStack server routes para instalação/retorno, com validação de entrada, correlação de autorização de uso único e verificação do portal antes de qualquer gravação privilegiada.
- Armazenamento isolado por empresa, regras de acesso na base e credenciais inacessíveis às consultas do navegador.
- Sincronização persistente e incremental, com cursores, exclusão mútua e callbacks autenticados em lotes limitados.
- Manter filtros compartilhados, mas passar dados por empresa de forma explícita; não substituir o mock por um estado global mutável.
- Testes pequenos para isolamento, permissões e vinculação portal/empresa, além da conferência completa com dados reais.