# Administração: análise e proposta

## Diagnóstico
- A tela fica fora do layout do app: sem menu lateral e sem barra superior, só com um link "Voltar ao painel". Parece outro produto.
- Ela mistura dois papéis diferentes:
  - **Dono da plataforma** (você): cria empresas clientes.
  - **Gestor da empresa**: convida pessoas, define perfis e vincula cada pessoa a um vendedor do CRM.
  Hoje só o administrador geral entra nela, então um gestor não consegue convidar o próprio time sem você.
- Todas as empresas aparecem empilhadas numa página só. Isso não funciona quando houver dezenas de clientes.
- Faltam o básico: convites pendentes (com reenviar e cancelar), busca, número de pessoas por empresa, status do Bitrix24 de cada empresa. A remoção ainda usa a caixinha de confirmação do navegador.
- O nome "Equipe" no menu já significa desempenho dos vendedores, o que confunde com "pessoas com acesso".

## Proposta: dividir em duas áreas, cada uma no lugar certo

```text
Menu lateral
  Análise
    Painel · Equipe · Relatórios
  Workspace
    Integrações
    Membros            <- novo, para gestores da empresa ativa
    Configurações
  Plataforma (só para o dono)
    Empresas           <- substitui "Administração"
```

### 1. Membros (gestores e administrador)
Fica dentro do layout normal e usa a empresa selecionada no topo.
- Abas: **Ativos** e **Convites pendentes**.
- Uma tabela com busca, mostrando pessoa, perfil, vendedor no CRM e último acesso.
- Botão "Convidar pessoas" abre uma janela: e-mail, perfil e vínculo com o vendedor (com sugestão automática quando o e-mail bate com um usuário do Bitrix24).
- Menu de ações em cada linha (trocar perfil, desvincular, remover), com confirmação numa janela própria.
- Nos convites pendentes: reenviar e cancelar.
- Um aviso aparece quando há vendedores do CRM sem ninguém vinculado.

### 2. Empresas (só o dono da plataforma)
- Lista com busca: nome, número de membros, status do Bitrix24, última sincronização e data de criação.
- Botão "Nova empresa" abre uma janela que já pede o e-mail do primeiro gestor e envia o convite.
- Um clique na empresa abre os detalhes: membros (mesma tabela de Membros), integração e as opções renomear e arquivar.
- Atalho "Entrar como esta empresa" para trocar a empresa ativa e ver o painel dela.

## O que não muda
- O acesso continua só por convite e a separação entre empresas continua garantida no banco de dados.
- A página "Equipe" (desempenho) continua igual.

## Detalhes técnicos
- Nova rota `/_authenticated/members.tsx` com gate `canManage` (gestor da empresa ativa ou admin). `/admin` é renomeada para `/companies` e o endereço antigo redireciona.
- Os server functions de convite, atualização e remoção passam a aceitar gestor da empresa (verificação via `member_role_of` = gestor ou `has_role` admin), não apenas admin.
- Convites pendentes: membros cujo usuário nunca fez login (`last_sign_in_at` nulo), lidos com o admin client depois de verificar quem chama. Reenviar usa `inviteUserByEmail` de novo.
- `createCompany` aceita `firstManagerEmail` opcional.
- Lista de empresas inclui contagem de membros e `bitrix_status`.
- Os dois menus entram em `app-shell.tsx` com o seu grupo e o atalho G+M na busca rápida.
- Testes: só gestor ou admin podem convidar; o colaborador é recusado.
