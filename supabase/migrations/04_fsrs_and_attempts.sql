-- =============================================================================
-- 04_fsrs_and_attempts.sql
-- FSRS state per (user, question), plus every attempt at an objective question
-- and every attempt at a discursive.
--
-- Note: session_id and simulado_id are plain uuid (no FK) because the parent
-- tables are defined in migration 05. They're nullable refs; integrity is
-- enforced at the application layer. Safe to alter in a future migration.
--
-- Idempotent.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- reviews: one FSRS state row per (user, question)
-- Field names + types match ts-fsrs v5 Card shape.
-- State: 0=New 1=Learning 2=Review 3=Relearning
-- -----------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  stability numeric,
  difficulty numeric,
  elapsed_days numeric,
  scheduled_days numeric,
  reps int not null default 0,
  lapses int not null default 0,
  state int2 not null default 0 check (state between 0 and 3),
  last_review timestamptz,
  due timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, question_id)
);

create index if not exists reviews_user_due_idx
  on public.reviews (user_id, due) where due is not null;

alter table public.reviews enable row level security;

drop policy if exists "Users read their own reviews" on public.reviews;
create policy "Users read their own reviews" on public.reviews
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert their own reviews" on public.reviews;
create policy "Users insert their own reviews" on public.reviews
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update their own reviews" on public.reviews;
create policy "Users update their own reviews" on public.reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete their own reviews" on public.reviews;
create policy "Users delete their own reviews" on public.reviews
  for delete using (auth.uid() = user_id);

drop trigger if exists set_updated_at on public.reviews;
create trigger set_updated_at
  before update on public.reviews
  for each row execute function public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- attempts: one row per objective-question answer
-- -----------------------------------------------------------------------------
create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  session_id uuid,      -- see study_sessions in migration 05 (no FK)
  simulado_id uuid,     -- see simulados in migration 05 (no FK)
  resposta_letra text check (resposta_letra is null or resposta_letra in ('A','B','C','D','E')),
  acertou boolean,
  confianca int2 check (confianca is null or confianca between 1 and 5),
  tempo_gasto_ms int,
  rating int2 check (rating is null or rating in (1,2,3,4)),  -- FSRS: Again/Hard/Good/Easy
  marcada_revisao boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists attempts_user_created_idx
  on public.attempts (user_id, created_at desc);
create index if not exists attempts_user_question_idx
  on public.attempts (user_id, question_id);
create index if not exists attempts_session_idx
  on public.attempts (session_id) where session_id is not null;
create index if not exists attempts_simulado_idx
  on public.attempts (simulado_id) where simulado_id is not null;

alter table public.attempts enable row level security;

drop policy if exists "Users read their own attempts" on public.attempts;
create policy "Users read their own attempts" on public.attempts
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert their own attempts" on public.attempts;
create policy "Users insert their own attempts" on public.attempts
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update their own attempts" on public.attempts;
create policy "Users update their own attempts" on public.attempts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete their own attempts" on public.attempts;
create policy "Users delete their own attempts" on public.attempts
  for delete using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- disc_attempts: one row per discursive answer
-- -----------------------------------------------------------------------------
create table if not exists public.disc_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  discursive_id uuid not null references public.discursives(id) on delete cascade,
  session_id uuid,     -- study_sessions (migration 05, no FK)
  simulado_id uuid,    -- simulados (migration 05, no FK)
  resposta_texto text,
  resposta_imagens text[],
  auto_avaliacao jsonb,
  avaliacao_ai jsonb,
  pontuacao_final numeric,
  viu_espelho boolean not null default false,
  tempo_gasto_ms int,
  created_at timestamptz not null default now()
);

create index if not exists disc_attempts_user_created_idx
  on public.disc_attempts (user_id, created_at desc);
create index if not exists disc_attempts_user_discursive_idx
  on public.disc_attempts (user_id, discursive_id);
create index if not exists disc_attempts_session_idx
  on public.disc_attempts (session_id) where session_id is not null;
create index if not exists disc_attempts_simulado_idx
  on public.disc_attempts (simulado_id) where simulado_id is not null;

alter table public.disc_attempts enable row level security;

drop policy if exists "Users read their own disc_attempts" on public.disc_attempts;
create policy "Users read their own disc_attempts" on public.disc_attempts
  for select using (auth.uid() = user_id);

drop policy if exists "Users insert their own disc_attempts" on public.disc_attempts;
create policy "Users insert their own disc_attempts" on public.disc_attempts
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update their own disc_attempts" on public.disc_attempts;
create policy "Users update their own disc_attempts" on public.disc_attempts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete their own disc_attempts" on public.disc_attempts;
create policy "Users delete their own disc_attempts" on public.disc_attempts
  for delete using (auth.uid() = user_id);
