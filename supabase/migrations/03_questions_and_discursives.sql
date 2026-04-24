-- =============================================================================
-- 03_questions_and_discursives.sql
-- User-owned banks of objective questions and discursive prompts.
-- Soft-delete via deleted_at. visibility = private | unlisted | public.
-- Idempotent.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- questions: objective (múltipla escolha) questions
-- -----------------------------------------------------------------------------
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  study_profile_id uuid references public.study_profiles(id) on delete set null,
  discipline_id uuid not null references public.disciplines(id) on delete restrict,
  topic_id uuid references public.topics(id) on delete set null,
  tema text,
  dificuldade int2 not null default 3 check (dificuldade between 1 and 5),
  banca_estilo text,
  enunciado text not null,
  enunciado_hash text,
  alternativas jsonb not null,
  gabarito text not null check (gabarito in ('A','B','C','D','E')),
  explicacao_geral text,
  pegadinhas text[],
  visibility text not null default 'private'
    check (visibility in ('private','unlisted','public')),
  origem text not null default 'manual',
  origem_details jsonb,
  forked_from uuid references public.questions(id) on delete set null,
  quality_score numeric not null default 0,
  total_feedback_positive int not null default 0,
  total_feedback_negative int not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Dedupe: one copy per (user, enunciado_hash) among live rows.
create unique index if not exists questions_user_hash_unique
  on public.questions (user_id, enunciado_hash)
  where deleted_at is null and enunciado_hash is not null;

-- Hot paths.
create index if not exists questions_user_discipline_live_idx
  on public.questions (user_id, discipline_id)
  where deleted_at is null;
create index if not exists questions_user_created_idx
  on public.questions (user_id, created_at desc)
  where deleted_at is null;
create index if not exists questions_public_feed_idx
  on public.questions (visibility, quality_score desc)
  where visibility = 'public' and deleted_at is null;
create index if not exists questions_forked_from_idx
  on public.questions (forked_from) where forked_from is not null;

alter table public.questions enable row level security;

drop policy if exists "Users read their own questions" on public.questions;
create policy "Users read their own questions" on public.questions
  for select using (auth.uid() = user_id);

drop policy if exists "Anyone reads public questions" on public.questions;
create policy "Anyone reads public questions" on public.questions
  for select using (visibility = 'public' and deleted_at is null);

drop policy if exists "Users insert their own questions" on public.questions;
create policy "Users insert their own questions" on public.questions
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update their own questions" on public.questions;
create policy "Users update their own questions" on public.questions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete their own questions" on public.questions;
create policy "Users delete their own questions" on public.questions
  for delete using (auth.uid() = user_id);

drop trigger if exists set_updated_at on public.questions;
create trigger set_updated_at
  before update on public.questions
  for each row execute function public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- discursives: essay-style prompts
-- -----------------------------------------------------------------------------
create table if not exists public.discursives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  study_profile_id uuid references public.study_profiles(id) on delete set null,
  discipline_id uuid not null references public.disciplines(id) on delete restrict,
  topic_id uuid references public.topics(id) on delete set null,
  tema text,
  dificuldade int2 not null default 3 check (dificuldade between 1 and 5),
  banca_estilo text,
  enunciado_completo text not null,
  texto_base text,
  comando text,
  quesitos jsonb,
  rubrica jsonb,
  espelho_resposta text,
  conceitos_chave text[],
  pegadinhas_esperadas text[],
  estrategia_redacao text,
  observacoes_corretor text,
  apostas_relacionadas text[],
  max_linhas int not null default 15,
  pontuacao_maxima numeric not null default 10,
  tipo_discursiva text check (tipo_discursiva in ('A','B','C')),
  visibility text not null default 'private'
    check (visibility in ('private','unlisted','public')),
  origem text not null default 'manual',
  origem_details jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists discursives_user_discipline_live_idx
  on public.discursives (user_id, discipline_id)
  where deleted_at is null;
create index if not exists discursives_user_created_idx
  on public.discursives (user_id, created_at desc)
  where deleted_at is null;
create index if not exists discursives_public_feed_idx
  on public.discursives (visibility, created_at desc)
  where visibility = 'public' and deleted_at is null;

alter table public.discursives enable row level security;

drop policy if exists "Users read their own discursives" on public.discursives;
create policy "Users read their own discursives" on public.discursives
  for select using (auth.uid() = user_id);

drop policy if exists "Anyone reads public discursives" on public.discursives;
create policy "Anyone reads public discursives" on public.discursives
  for select using (visibility = 'public' and deleted_at is null);

drop policy if exists "Users insert their own discursives" on public.discursives;
create policy "Users insert their own discursives" on public.discursives
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update their own discursives" on public.discursives;
create policy "Users update their own discursives" on public.discursives
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete their own discursives" on public.discursives;
create policy "Users delete their own discursives" on public.discursives
  for delete using (auth.uid() = user_id);

drop trigger if exists set_updated_at on public.discursives;
create trigger set_updated_at
  before update on public.discursives
  for each row execute function public.handle_updated_at();
