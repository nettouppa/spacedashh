create table public.ai_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  provider text not null default 'openai',
  api_key text not null,
  key_last4 text not null,
  model text not null default 'gpt-4o-mini',
  updated_by uuid,
  updated_at timestamptz not null default now()
);
grant all on public.ai_settings to service_role;
alter table public.ai_settings enable row level security;

create or replace function public.ai_status(_company_id uuid)
returns table(connected boolean, last4 text, model text)
language sql stable security definer set search_path = public as $$
  select true, s.key_last4, s.model from public.ai_settings s
  where s.company_id = _company_id
    and (public.is_member(auth.uid(), _company_id) or public.has_role(auth.uid(), 'admin'))
$$;
revoke execute on function public.ai_status(uuid) from public, anon;
grant execute on function public.ai_status(uuid) to authenticated;