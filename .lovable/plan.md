# Atlas com OpenAI — chave própria de cada empresa

## O que muda para o usuário
- Na página **Integrações**, um novo bloco **"Inteligência artificial (OpenAI)"**.
- Gestor/admin cola a API key da OpenAI da empresa, escolhe o modelo (padrão `gpt-4o-mini`; opções `gpt-4o`, `gpt-4.1-mini`, `gpt-4.1`) e clica **Testar e salvar**. A chave é validada na hora.
- Depois de salva, a chave nunca é exibida de novo: só aparece "Conectada · termina em ••••abcd", com opções **Trocar chave** e **Remover**.
- Colaboradores veem apenas o status (conectada ou não).
- O Atlas (chat e voz) passa a usar a OpenAI da empresa selecionada. Sem chave configurada, o Atlas mostra uma mensagem amigável: "Peça ao gestor para conectar a OpenAI em Integrações" (com link para gestores).
- Erros da OpenAI viram mensagens claras: chave inválida, sem créditos/limite, muitas solicitações.

## Segurança
- Chave guardada numa tabela só acessível pelo servidor (como os tokens do Bitrix24); nenhum usuário lê a chave pelo navegador.
- Só gestor/admin da empresa pode salvar/remover; verificação feita no servidor.
- O Atlas exige usuário logado e membro da empresa antes de usar a chave.
- Link de TV não usa IA (não há Atlas no modo TV público).

## Detalhes técnicos
- Migração: tabela `ai_settings` (company_id PK, provider 'openai', api_key text, key_last4, model, updated_by, updated_at). RLS ligada sem políticas para authenticated; GRANT só para service_role. Função security-definer `ai_status(company_id)` retornando {connected, last4, model} para membros.
- `src/lib/ai-settings.functions.ts` (requireSupabaseAuth): `getAiStatus`, `saveAiKey` (checa papel gestor/admin via `member_role_of`/`has_role` com o cliente do usuário, testa a chave com `GET https://api.openai.com/v1/models`, grava com admin client carregado dentro do handler), `removeAiKey`.
- `askAssistant`: adicionar `requireSupabaseAuth` + `companyId` no input; checar `is_member`; buscar chave com admin client; chamar `https://api.openai.com/v1/chat/completions` com o modelo da empresa (mesmo formato de tools). Mapear 401/429/insufficient_quota.
- `ai-panel.tsx` / `voice-mode.tsx`: enviar `companyId`; tratar estado "sem chave".
- `integrations.tsx`: novo card de configuração seguindo o design atual.
- Teste unitário para a regra "só gestor/admin pode configurar a chave" na política compartilhada.
- Registrar a decisão em AGENTS.md.
