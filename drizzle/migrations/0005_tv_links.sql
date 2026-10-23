create table public.tv_links (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  token_hash text not null unique,
  name text not null,
  views jsonb not null default '[]'::jsonb,
  interval_sec int not null default 30 check (interval_sec between 10 and 600),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_seen_at timestamptz
);
grant select, insert, update on public.tv_links to authenticated;
grant all on public.tv_links to service_role;
alter table public.tv_links enable row level security;
create policy "tv links managers read" on public.tv_links for select to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.member_role_of(auth.uid(), company_id) = 'gestor');
create policy "tv links managers insert" on public.tv_links for insert to authenticated
  with check (created_by = auth.uid() and (public.has_role(auth.uid(), 'admin') or public.member_role_of(auth.uid(), company_id) = 'gestor'));
create policy "tv links managers update" on public.tv_links for update to authenticated
  using (public.has_role(auth.uid(), 'admin') or public.member_role_of(auth.uid(), company_id) = 'gestor');