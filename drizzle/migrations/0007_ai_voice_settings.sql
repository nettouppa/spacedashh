alter table public.ai_settings add column voice_settings jsonb not null default '{}'::jsonb;

create or replace function public.ai_voice_settings(_company_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select s.voice_settings from public.ai_settings s
  where s.company_id = _company_id
    and (public.is_member(auth.uid(), _company_id) or public.has_role(auth.uid(), 'admin'))
$$;
revoke execute on function public.ai_voice_settings(uuid) from public, anon;
grant execute on function public.ai_voice_settings(uuid) to authenticated;