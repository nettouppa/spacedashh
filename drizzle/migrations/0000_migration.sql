-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

-- Global roles
create type public.app_role as enum ('admin');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- Companies (tenants)
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.companies to authenticated;
grant all on public.companies to service_role;
alter table public.companies enable row level security;

create type public.member_role as enum ('gestor', 'colaborador');
create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null,
  role public.member_role not null default 'colaborador',
  seller_ref text,
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);
grant select, insert, update, delete on public.company_members to authenticated;
grant all on public.company_members to service_role;
alter table public.company_members enable row level security;

create or replace function public.is_member(_user_id uuid, _company_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.company_members where user_id = _user_id and company_id = _company_id)
$$;
create or replace function public.member_role_of(_user_id uuid, _company_id uuid)
returns public.member_role language sql stable security definer set search_path = public as $$
  select role from public.company_members where user_id = _user_id and company_id = _company_id
$$;

-- profiles policies
create policy "profiles self or admin read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin')
    or exists (select 1 from public.company_members m where m.user_id = profiles.id and public.member_role_of(auth.uid(), m.company_id) = 'gestor'));
create policy "profiles self update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles self insert" on public.profiles for insert to authenticated with check (id = auth.uid());

-- companies policies
create policy "companies members read" on public.companies for select to authenticated
  using (public.is_member(auth.uid(), id) or public.has_role(auth.uid(), 'admin'));
create policy "companies admin write" on public.companies for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- members policies
create policy "members read" on public.company_members for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin') or public.member_role_of(auth.uid(), company_id) = 'gestor');
create policy "members admin write" on public.company_members for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Per-user dashboard layouts
create table public.user_layouts (
  user_id uuid not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  layout jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, company_id)
);
grant select, insert, update, delete on public.user_layouts to authenticated;
grant all on public.user_layouts to service_role;
alter table public.user_layouts enable row level security;
create policy "layouts own" on public.user_layouts for all to authenticated
  using (user_id = auth.uid() and public.is_member(auth.uid(), company_id))
  with check (user_id = auth.uid() and public.is_member(auth.uid(), company_id));

-- New user: profile; first user ever becomes admin with a demo company as gestor
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
    insert into public.companies (name) values ('Empresa demonstração') returning id into cid;
    insert into public.company_members (company_id, user_id, role) values (cid, new.id, 'gestor');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();