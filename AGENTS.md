<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- CRM data is a deterministic mock in `src/lib/crm-data.ts` standing in for Bitrix24 `crm.deal.list`; all widgets derive from `filterDeals`, so swapping in a real Bitrix24 sync only requires replacing `DEALS`.
- Cross-filtering: one `Filters` state in `src/routes/_authenticated/dashboard.tsx`; widgets call `set()` and each widget skips its own dimension so siblings stay visible.
- AI assistant uses a server function (`src/lib/ai.functions.ts`) with tool calling to return dashboard filter actions.
- Tenancy: `companies` + `company_members` (role gestor|colaborador, `seller_ref` maps a member to a CRM seller); RLS via security-definer `is_member`/`member_role_of`; global admin lives in `user_roles` (`has_role`). Keeps tenant isolation in the database.
- Access is invite-only: users without a membership see "Aguardando convite"; the first user ever becomes admin (trigger `handle_new_user`). Admin invites from `/admin` via server functions in `src/lib/account.functions.ts`.
- Per-user, per-company card layout is stored in `user_layouts.layout` ({order, sizes}), not localStorage, so it follows the account.
- Bitrix tenant binding happens only via OAuth started by a manager (single-use 15-min state in `bitrix_oauth_states`); the portal install event stores no tokens. Tokens live in `bitrix_connections` (service_role only), status exposed via `bitrix_status()`.
- Integration setup reads company access through authenticated RLS queries and exposes no credentials; manager/admin controls are derived from a shared policy to keep UI and future operations consistent.
- Atlas AI uses each company's own OpenAI key stored in `ai_settings` (service_role only, status via `ai_status()`); `askAssistant` requires auth + membership. Keeps tenant billing and credentials isolated.
- Atlas personality lives under `ai_settings.voice_settings.personality` and shares one prompt policy across chat and voice; dedicated manager-authorized saves preserve voice preferences, and voice saves preserve personality to avoid cross-setting overwrites.
- Atlas voice answers stream from `/api/atlas-stream` (NDJSON) and are spoken sentence by sentence; chat and voice share `buildAtlasBody` so both use the same prompt, data and model.
