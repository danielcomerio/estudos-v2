-- =============================================================================
-- 06_feedback_and_community.sql
-- Quality feedback on questions, threaded comments, and content reports.
-- Includes a trigger that keeps questions.quality_score + counters in sync.
-- Idempotent.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- question_feedback: +1 / -1 on a question or its explanation
-- -----------------------------------------------------------------------------
create table if not exists public.question_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  target text not null check (target in ('question','explanation')),
  vote int2 not null check (vote in (-1, 1)),
  motivo text check (motivo is null or motivo in
    ('gabarito_errado','ambigua','erro_factual','explicacao_ruim','outro')),
  comentario text,
  created_at timestamptz not null default now(),
  unique (user_id, question_id, target)
);

create index if not exists question_feedback_question_idx
  on public.question_feedback (question_id, target);

alter table public.question_feedback enable row level security;

-- Authors of the question and voters themselves can see feedback.
drop policy if exists "Users read feedback on their own questions" on public.question_feedback;
create policy "Users read feedback on their own questions" on public.question_feedback
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.questions q
      where q.id = question_id and q.user_id = auth.uid()
    )
  );

drop policy if exists "Users insert their own feedback" on public.question_feedback;
create policy "Users insert their own feedback" on public.question_feedback
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users update their own feedback" on public.question_feedback;
create policy "Users update their own feedback" on public.question_feedback
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete their own feedback" on public.question_feedback;
create policy "Users delete their own feedback" on public.question_feedback
  for delete using (auth.uid() = user_id);

-- Trigger: recompute quality_score + totals on questions.
-- Runs AFTER INSERT/UPDATE/DELETE on feedback for target='question'.
create or replace function public.recalc_question_quality()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qid uuid;
  v_pos int;
  v_neg int;
begin
  v_qid := coalesce(new.question_id, old.question_id);
  if v_qid is null then
    return coalesce(new, old);
  end if;

  select
    count(*) filter (where vote = 1 and target = 'question'),
    count(*) filter (where vote = -1 and target = 'question')
  into v_pos, v_neg
  from public.question_feedback
  where question_id = v_qid;

  update public.questions
  set total_feedback_positive = coalesce(v_pos, 0),
      total_feedback_negative = coalesce(v_neg, 0),
      quality_score = case
        when coalesce(v_pos, 0) + coalesce(v_neg, 0) = 0 then 0
        else (coalesce(v_pos, 0) - coalesce(v_neg, 0))::numeric
             / (coalesce(v_pos, 0) + coalesce(v_neg, 0))
      end
  where id = v_qid;

  return coalesce(new, old);
end;
$$;

drop trigger if exists recalc_quality_on_feedback on public.question_feedback;
create trigger recalc_quality_on_feedback
  after insert or update or delete on public.question_feedback
  for each row execute function public.recalc_question_quality();

-- -----------------------------------------------------------------------------
-- question_comments: threaded comments on (public) questions
-- -----------------------------------------------------------------------------
create table if not exists public.question_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  parent_comment_id uuid references public.question_comments(id) on delete cascade,
  texto text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists question_comments_question_idx
  on public.question_comments (question_id, created_at) where deleted_at is null;
create index if not exists question_comments_parent_idx
  on public.question_comments (parent_comment_id) where parent_comment_id is not null;

alter table public.question_comments enable row level security;

-- Comments are visible on any question the viewer can see (own + public).
drop policy if exists "Comments follow question visibility" on public.question_comments;
create policy "Comments follow question visibility" on public.question_comments
  for select using (
    deleted_at is null
    and exists (
      select 1 from public.questions q
      where q.id = question_id
        and (q.user_id = auth.uid() or q.visibility = 'public')
        and q.deleted_at is null
    )
  );

drop policy if exists "Users insert their own comments" on public.question_comments;
create policy "Users insert their own comments" on public.question_comments
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.questions q
      where q.id = question_id
        and (q.user_id = auth.uid() or q.visibility = 'public')
        and q.deleted_at is null
    )
  );

drop policy if exists "Users update their own comments" on public.question_comments;
create policy "Users update their own comments" on public.question_comments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No hard-delete policy: comments use deleted_at (soft).
drop trigger if exists set_updated_at on public.question_comments;
create trigger set_updated_at
  before update on public.question_comments
  for each row execute function public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- reports: polymorphic content reports (moderated by staff)
-- -----------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('question','discursive','comment','profile')),
  target_id uuid not null,
  motivo text,
  status text not null default 'open' check (status in ('open','investigating','closed')),
  created_at timestamptz not null default now()
);

create index if not exists reports_target_idx on public.reports (target_type, target_id);
create index if not exists reports_open_idx on public.reports (status) where status <> 'closed';

alter table public.reports enable row level security;

-- Reporters see their own reports. Staff (service_role) bypasses RLS.
drop policy if exists "Reporters read their own reports" on public.reports;
create policy "Reporters read their own reports" on public.reports
  for select using (auth.uid() = reporter_user_id);

drop policy if exists "Users file their own reports" on public.reports;
create policy "Users file their own reports" on public.reports
  for insert with check (auth.uid() = reporter_user_id);
