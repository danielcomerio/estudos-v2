-- =============================================================================
-- 07_storage_and_rpcs.sql
-- Storage buckets (backups, disc_images, avatars) + storage RLS.
-- RPCs: get_profile_disciplines, get_due_questions, consume_credits,
--       fork_question.
-- Views: public_questions_feed, user_statistics.
-- Idempotent.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STORAGE BUCKETS
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('backups', 'backups', false)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public) values
  ('disc_images', 'disc_images', false)
on conflict (id) do update set public = excluded.public;

insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

-- Storage RLS policies (on storage.objects). Convention: files live under a
-- folder named <user_uuid>/ so the policy can match via storage.foldername().

-- backups: no user-level policy. Only service_role (via the admin route)
-- reads/writes this bucket. Drop any stale policies for safety.
drop policy if exists "Users manage their own backups" on storage.objects;

-- disc_images (private, per-user folder).
drop policy if exists "Users read their own disc_images" on storage.objects;
create policy "Users read their own disc_images" on storage.objects
  for select to authenticated using (
    bucket_id = 'disc_images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users upload their own disc_images" on storage.objects;
create policy "Users upload their own disc_images" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'disc_images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update their own disc_images" on storage.objects;
create policy "Users update their own disc_images" on storage.objects
  for update to authenticated using (
    bucket_id = 'disc_images'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'disc_images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete their own disc_images" on storage.objects;
create policy "Users delete their own disc_images" on storage.objects
  for delete to authenticated using (
    bucket_id = 'disc_images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- avatars (public read; write scoped to own folder).
drop policy if exists "Anyone reads avatars" on storage.objects;
create policy "Anyone reads avatars" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "Users upload their own avatar" on storage.objects;
create policy "Users upload their own avatar" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update their own avatar" on storage.objects;
create policy "Users update their own avatar" on storage.objects
  for update to authenticated using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete their own avatar" on storage.objects;
create policy "Users delete their own avatar" on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================================
-- RPCs
-- =============================================================================

-- get_profile_disciplines: disciplines configured on a given study_profile.
create or replace function public.get_profile_disciplines(p_study_profile_id uuid)
returns table (
  discipline_id uuid,
  slug text,
  name text,
  short_name text,
  module text,
  cor_hex text,
  icone text,
  ordem int,
  num_questoes int,
  pontos_por_questao numeric,
  peso numeric,
  pontuacao_minima int
)
language sql
stable
security invoker
as $$
  select
    d.id, d.slug, d.name, d.short_name, d.module, d.cor_hex, d.icone, d.ordem,
    spd.num_questoes, spd.pontos_por_questao, spd.peso, spd.pontuacao_minima
  from public.study_profile_disciplines spd
  join public.disciplines d on d.id = spd.discipline_id
  where spd.study_profile_id = p_study_profile_id
  order by d.ordem;
$$;

-- get_due_questions: questions due for review now (or never reviewed)
-- for the calling user, scoped to a study_profile.
create or replace function public.get_due_questions(
  p_study_profile_id uuid,
  p_limit int default 20
)
returns setof public.questions
language sql
stable
security invoker
as $$
  select q.*
  from public.questions q
  left join public.reviews r
    on r.question_id = q.id and r.user_id = auth.uid()
  where q.user_id = auth.uid()
    and q.study_profile_id = p_study_profile_id
    and q.deleted_at is null
    and (r.due is null or r.due <= now())
  order by coalesce(r.due, '-infinity'::timestamptz) asc
  limit p_limit;
$$;

-- consume_credits: debit credits for the calling user, with daily reset.
-- Returns jsonb { ok, used, allowance, reason? }.
create or replace function public.consume_credits(p_amount int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_now timestamptz := now();
  v_today_start timestamptz := date_trunc('day', v_now);
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if p_amount < 0 then
    raise exception 'amount must be non-negative';
  end if;

  select * into v_profile from public.profiles where id = v_user for update;
  if not found then
    raise exception 'Profile not found';
  end if;

  -- Reset counter if we've crossed a day boundary.
  if v_profile.credits_reset_at is null or v_profile.credits_reset_at <= v_now then
    v_profile.credits_used_today := 0;
    v_profile.credits_reset_at := v_today_start + interval '1 day';
  end if;

  if v_profile.credits_used_today + p_amount > v_profile.credits_daily_allowance then
    update public.profiles
       set credits_reset_at = v_profile.credits_reset_at
     where id = v_user;
    return jsonb_build_object(
      'ok', false,
      'reason', 'daily_limit_exceeded',
      'used', v_profile.credits_used_today,
      'allowance', v_profile.credits_daily_allowance
    );
  end if;

  update public.profiles
     set credits_used_today = v_profile.credits_used_today + p_amount,
         credits_reset_at = v_profile.credits_reset_at
   where id = v_user;

  return jsonb_build_object(
    'ok', true,
    'used', v_profile.credits_used_today + p_amount,
    'allowance', v_profile.credits_daily_allowance
  );
end;
$$;

-- fork_question: clone a public question into the caller's bank.
-- Returns the new question id.
create or replace function public.fork_question(p_question_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_source public.questions%rowtype;
  v_new_id uuid;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_source
  from public.questions
  where id = p_question_id
    and visibility = 'public'
    and deleted_at is null;

  if not found then
    raise exception 'Source question not found or not public';
  end if;

  insert into public.questions (
    user_id, study_profile_id, discipline_id, topic_id, tema,
    dificuldade, banca_estilo, enunciado, enunciado_hash, alternativas,
    gabarito, explicacao_geral, pegadinhas, visibility, origem,
    origem_details, forked_from
  ) values (
    v_user, null, v_source.discipline_id, v_source.topic_id, v_source.tema,
    v_source.dificuldade, v_source.banca_estilo, v_source.enunciado,
    v_source.enunciado_hash, v_source.alternativas,
    v_source.gabarito, v_source.explicacao_geral, v_source.pegadinhas,
    'private', 'forked',
    jsonb_build_object('forked_at', now(), 'source_id', v_source.id),
    v_source.id
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

-- =============================================================================
-- VIEWS
-- =============================================================================

-- public_questions_feed: the community feed. security_invoker so RLS on
-- public.questions is respected (caller sees only rows the policies allow —
-- i.e. public + not deleted).
create or replace view public.public_questions_feed
with (security_invoker = true)
as
select
  q.id, q.discipline_id, q.topic_id, q.tema, q.dificuldade, q.banca_estilo,
  q.enunciado, q.alternativas, q.gabarito, q.explicacao_geral,
  q.quality_score, q.total_feedback_positive, q.total_feedback_negative,
  q.created_at, q.updated_at,
  p.handle as author_handle,
  p.display_name as author_name,
  p.is_public_profile as author_is_public
from public.questions q
left join public.profiles p on p.id = q.user_id
where q.visibility = 'public'
  and q.deleted_at is null
  and q.quality_score >= 0;

-- user_statistics: one-row summary for the calling user. security_invoker
-- so the underlying RLS policies enforce that the user only counts their
-- own rows. Returns 0s when authenticated but empty-state.
create or replace view public.user_statistics
with (security_invoker = true)
as
select
  (select count(*) from public.questions
    where user_id = auth.uid() and deleted_at is null) as total_questions,
  (select count(*) from public.attempts
    where user_id = auth.uid()) as total_attempts,
  (select count(*) from public.attempts
    where user_id = auth.uid() and acertou) as total_correct,
  (select count(*) from public.reviews
    where user_id = auth.uid() and due is not null and due <= now()) as due_now,
  (select count(*) from public.discursives
    where user_id = auth.uid() and deleted_at is null) as total_discursives,
  (select count(*) from public.disc_attempts
    where user_id = auth.uid()) as total_disc_attempts;
