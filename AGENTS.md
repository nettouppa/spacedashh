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
- Cross-filtering: one `Filters` state in the index route; widgets call `set()` and each widget skips its own dimension so siblings stay visible.
- AI assistant uses a server function (`src/lib/ai.functions.ts`) with tool calling to return dashboard filter actions.
