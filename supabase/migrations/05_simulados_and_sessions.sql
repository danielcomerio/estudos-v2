-- =============================================================================
-- 05_simulados_and_sessions.sql
-- simulado_templates (reusable configs) + simulados (executed instances)
-- + study_sessions (grouping of practice attempts).
-- Idempotent.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- simulado_templates: reusable simulation configuration (a preset)
-- -----------------------------------------------------------------------------
create table if not exists public.simulado_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  study_profile_id uuid references public.study_profiles(id) on delete set null,
  nome text not null,
  descricao text,
  num_questoes_objetivas int not null default 60,
  num_discursivas int not null default 0,
  tempo_minutos int not null default 240,
  cotas jsonb not null default '{}'::jsonb,
  dificuldade_min int2 not null default 1 check (dificuldade_min between 1 and 5),
  dificuldade_max int2 not null default 5 check (dificuldade_max between 1 and 5),
  criterio_selecao text not null default 'random'
    check (criterio_selecao in ('random','quality_score','fsrs_due')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (dificuldade_min <= dificuldade_max)
);

create index if not exists simulado_templates_user_idx
  on public.simulado_templates (user_id);
-- At most one default template per user.
create unique index if not exists simulado_templates_one_default_per_user
  on public.simulado_templates (user_id) where is_default = true;

alter table public.simulado_templates enable row level security;

drop policy if exists "Users read their own simulado_templates" on public.simulado_templates;
create policy "Users read their own simulado_templates" on public.simulado_templates
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert their own simulado_templates" on public.simulado_templates;
create policy "Users insert their own simulado_templates" on public.simulado_templates
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update their own simulado_templates" on public.simulado_templates;
create policy "Users update their own simulado_templates" on public.simulado_templates
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete their own simulado_templates" on public.simulado_templates;
create policy "Users delete their own simulado_templates" on public.simulado_templates
  for delete using (auth.uid() = user_id);

drop trigger if exists set_updated_at on public.simulado_templates;
create trigger set_updated_at
  before update on public.simulado_templates
  for each row execute function public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- simulados: an executed instance of a template (or ad-hoc)
-- -----------------------------------------------------------------------------
create table if not exists public.simulados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id uuid references public.simulado_templates(id) on delete set null,
  nome_snapshot text,
  iniciado_em timestamptz not null default now(),
  finalizado_em timestamptz,
  tempo_total_ms int,
  questoes_ids uuid[] not null default '{}',
  discursivas_ids uuid[] not null default '{}',
  pontuacao_objetiva numeric,
  pontuacao_discursiva numeric,
  pontuacao_total numeric,
  flags uuid[] not null default '{}',
  status text not null default 'em_andamento'
    check (status in ('em_andamento','finalizado','abandonado')),
  created_at timestamptz not null default now()
);

create index if not exists simulados_user_iniciado_idx
  on public.simulados (user_id, iniciado_em desc);
create index if not exists simulados_user_status_idx
  on public.simulados (user_id, status);

alter table public.simulados enable row level security;

drop policy if exists "Users read their own simulados" on public.simulados;
create policy "Users read their own simulados" on public.simulados
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert their own simulados" on public.simulados;
create policy "Users insert their own simulados" on public.simulados
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update their own simulados" on public.simulados;
create policy "Users update their own simulados" on public.simulados
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete their own simulados" on public.simulados;
create policy "Users delete their own simulados" on public.simulados
  for delete using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- study_sessions: a practice session, groups attempts via attempts.session_id
-- -----------------------------------------------------------------------------
create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  study_profile_id uuid references public.study_profiles(id) on delete set null,
  nome text,
  config jsonb not null default '{}'::jsonb,
  modo text not null default 'aleatorio'
    check (modo in ('aleatorio','ordem','fsrs','repetir_erradas')),
  num_questoes_alvo int,
  num_questoes_respondidas int not null default 0,
  tempo_total_ms int not null default 0,
  finalizada boolean not null default false,
  iniciada_em timestamptz not null default now(),
  finalizada_em timestamptz
);

create index if not exists study_sessions_user_iniciada_idx
  on public.study_sessions (user_id, iniciada_em desc);
create index if not exists study_sessions_user_live_idx
  on public.study_sessions (user_id) where finalizada = false;

alter table public.study_sessions enable row level security;

drop policy if exists "Users read their own study_sessions" on public.study_sessions;
create policy "Users read their own study_sessions" on public.study_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert their own study_sessions" on public.study_sessions;
create policy "Users insert their own study_sessions" on public.study_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update their own study_sessions" on public.study_sessions;
create policy "Users update their own study_sessions" on public.study_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete their own study_sessions" on public.study_sessions;
create policy "Users delete their own study_sessions" on public.study_sessions
  for delete using (auth.uid() = user_id);
