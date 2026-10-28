# Trocar a conexão Bitrix24: de aplicativo (marketplace) para REST API (webhook de entrada)

## Por que o webhook de entrada
A documentação oficial lista três formas de acessar a REST API: **webhook de entrada**, **aplicativo local** e **aplicativo do Market**.
- Webhook de entrada: o cliente gera uma URL com chave no próprio portal e cola no Spacedash. Sem publicar nada, sem login OAuth, sem tokens que expiram. Melhor encaixe para clientes convidados.
- Aplicativo local: também não vai ao Market, mas exige o cliente criar app, copiar ID e chave secreta e passar por OAuth — mais passos sem ganho para leitura de dados.
- Market: o que tínhamos; só faz sentido para venda em massa no futuro.
Cuidado apontado pela documentação: a chave do webhook não pode aparecer no código nem em logs, e as permissões seguem as do usuário que criou o webhook (recomendar um usuário administrador).

## Como fica para o cliente
1. No Bitrix24 dele: Aplicativos > Recursos para desenvolvedores > Outro > **Webhook de entrada**.
2. Marca as permissões: CRM, Usuários, Departamentos, Tarefas, Canais Abertos.
3. Copia a URL gerada (ex.: `https://empresa.bitrix24.com.br/rest/1/abc123xyz/`).
4. No Spacedash, em **Integrações**, o gestor cola essa URL e clica em **Conectar**.
5. O Spacedash testa a URL na hora (consulta o usuário e o CRM); se der certo, salva e já sincroniza.

Nada de instalar app, redirecionamento ou código temporário que expira.

## O que muda
- **Tela de Integrações**: troca o campo "domínio + Conectar via Bitrix24" por um campo "URL do webhook", com passo a passo curto e link de ajuda. Mantém Sincronizar, Desconectar e status. Mostra apenas o domínio e o usuário do webhook, nunca a chave.
- **Conexão no servidor**: a URL é validada (formato `https://<portal>/rest/<id>/<chave>/`), testada com `profile` e `crm.deal.list`, e guardada só no servidor. Cada chamada usa `URL + método`, sem tokens nem renovação.
- **Permissões**: só gestor/admin conecta ou troca a URL (mesma regra atual). Um portal continua ligado a uma só empresa.
- **Remoções**: rotas de instalação e retorno do aplicativo, tabela de estados temporários do login, a passagem pelo `/dashboard` que capturava o código e as credenciais do app (client id/secret). Pode apagar o aplicativo criado no portal parceiro.
- **Dados já importados**: a conexão atual da empresa de teste será removida e você reconecta com o webhook; negócios, usuários, etapas, atividades e tarefas já sincronizados continuam lá.

## Detalhes técnicos
- Migração: em `bitrix_connections` adicionar `webhook_url text` (service_role only), tornar `access_token`, `refresh_token`, `expires_at`, `client_endpoint` opcionais (depois remover), `auth_mode`; dropar `bitrix_oauth_states`. `bitrix_status()` segue expondo só domínio/status.
- `bitrix.server.ts`: remover `oauth/exchangeCode/refreshTokens/freshToken`; `call()` vira `fetch(webhook_url + method + '.json', POST JSON)`; tratar erros `INVALID_CREDENTIALS`, `insufficient_scope`, `QUERY_LIMIT_EXCEEDED` (retry com espera) com mensagens em português.
- `bitrix.functions.ts`: substituir `startBitrixConnect` por `connectBitrixWebhook({ companyId, url })` com Zod + teste de conexão; `syncBitrixNow`/`disconnectBitrix` iguais.
- `bitrix-policy.ts`: trocar `BITRIX_SETUP_URLS` por `parseWebhookUrl()`; testes unitários para URLs válidas/inválidas (http, sem `/rest/`, sem chave).
- Apagar `src/routes/api/public/bitrix/install.ts` e `callback.ts`; remover `beforeLoad` de OAuth em `dashboard.tsx`.
- Atualizar `AGENTS.md` (regra de vínculo Bitrix) e a memória de requisitos (conexão via webhook REST, não aplicativo).

## Fora deste ajuste
Eventos em tempo real (webhook de saída do Bitrix24) podem vir depois; por ora, sincronização manual como hoje.
