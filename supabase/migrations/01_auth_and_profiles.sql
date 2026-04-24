-- =============================================================================
-- 01_auth_and_profiles.sql
-- profiles (extends auth.users) + study_profiles (per-user exam profile)
-- Also defines the shared handle_updated_at() trigger function used everywhere.
-- Idempotent: safe to re-run.
-- =============================================================================

-- Shared trigger fn: stamps updated_at on UPDATE.
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles: 1:1 with auth.users
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  handle text unique,
  is_public_profile boolean not null default false,
  bio text,
  tier text not null default 'free' check (tier in ('free', 'plus', 'pro', 'unlimited')),
  credits_daily_allowance int not null default 100,
  credits_used_today int not null default 0,
  credits_reset_at timestamptz,
  anthropic_api_key_encrypted text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_handle_idx on public.profiles (handle) where handle is not null;

alter table public.profiles enable row level security;

drop policy if exists "Users read their own profile" on public.profiles;
create policy "Users read their own profile" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "Anyone reads public profiles" on public.profiles;
create policy "Anyone reads public profiles" on public.profiles
  for select using (is_public_profile = true);

drop policy if exists "Users insert their own profile" on public.profiles;
create policy "Users insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Auto-create profile row when auth.users row is inserted.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- study_profiles: a user can keep multiple (e.g. one per concurso)
-- -----------------------------------------------------------------------------
create table if not exists public.study_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  nome_concurso text,
  orgao text,
  cargo text,
  banca text,
  data_prova date,
  is_active boolean not null default true,
  is_default boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  schema_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists study_profiles_user_idx on public.study_profiles (user_id);
-- At most one default study_profile per user.
create unique index if not exists study_profiles_one_default_per_user
  on public.study_profiles (user_id) where is_default = true;

alter table public.study_profiles enable row level security;

drop policy if exists "Users read their own study_profiles" on public.study_profiles;
create policy "Users read their own study_profiles" on public.study_profiles
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert their own study_profiles" on public.study_profiles;
create policy "Users insert their own study_profiles" on public.study_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update their own study_profiles" on public.study_profiles;
create policy "Users update their own study_profiles" on public.study_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete their own study_profiles" on public.study_profiles;
create policy "Users delete their own study_profiles" on public.study_profiles
  for delete using (auth.uid() = user_id);

drop trigger if exists set_updated_at on public.study_profiles;
create trigger set_updated_at
  before update on public.study_profiles
  for each row execute function public.handle_updated_at();
