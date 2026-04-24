-- =============================================================================
-- 02_disciplines_and_topics.sql
-- Canonical disciplines/topics (shared across users) + per-user-profile config.
-- Seeds the 16 disciplines for the MP-ES (Cientista de Dados) exam.
-- Idempotent.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- disciplines: globally shared reference data
-- -----------------------------------------------------------------------------
create table if not exists public.disciplines (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  short_name text,
  module text,
  ordem int not null default 0,
  cor_hex text,
  icone text,
  created_at timestamptz not null default now()
);

alter table public.disciplines enable row level security;

drop policy if exists "Anyone reads disciplines" on public.disciplines;
create policy "Anyone reads disciplines" on public.disciplines
  for select using (true);
-- No insert/update/delete policies: only service_role (bypasses RLS) can write.

-- -----------------------------------------------------------------------------
-- topics: hierarchical subtopics of a discipline
-- -----------------------------------------------------------------------------
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  discipline_id uuid not null references public.disciplines(id) on delete cascade,
  slug text not null,
  name text not null,
  parent_topic_id uuid references public.topics(id) on delete set null,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  unique (discipline_id, slug)
);

create index if not exists topics_discipline_idx on public.topics (discipline_id);
create index if not exists topics_parent_idx on public.topics (parent_topic_id);

alter table public.topics enable row level security;

drop policy if exists "Anyone reads topics" on public.topics;
create policy "Anyone reads topics" on public.topics
  for select using (true);

-- Authenticated users may insert topics (app auto-creates them on import).
-- UPDATE/DELETE kept restricted to service_role.
drop policy if exists "Authenticated insert topics" on public.topics;
create policy "Authenticated insert topics" on public.topics
  for insert to authenticated with check (true);

-- -----------------------------------------------------------------------------
-- study_profile_disciplines: which disciplines a study_profile covers + config
-- (points per question, weight, cota, etc.)
-- -----------------------------------------------------------------------------
create table if not exists public.study_profile_disciplines (
  id uuid primary key default gen_random_uuid(),
  study_profile_id uuid not null references public.study_profiles(id) on delete cascade,
  discipline_id uuid not null references public.disciplines(id) on delete restrict,
  num_questoes int,
  pontos_por_questao numeric,
  peso numeric not null default 1.0,
  pontuacao_minima int not null default 0,
  unique (study_profile_id, discipline_id)
);

create index if not exists spd_study_profile_idx on public.study_profile_disciplines (study_profile_id);

alter table public.study_profile_disciplines enable row level security;

-- Ownership derived via study_profile.
drop policy if exists "Users read their own study_profile_disciplines"
  on public.study_profile_disciplines;
create policy "Users read their own study_profile_disciplines"
  on public.study_profile_disciplines
  for select using (
    exists (
      select 1 from public.study_profiles sp
      where sp.id = study_profile_id and sp.user_id = auth.uid()
    )
  );

drop policy if exists "Users insert their own study_profile_disciplines"
  on public.study_profile_disciplines;
create policy "Users insert their own study_profile_disciplines"
  on public.study_profile_disciplines
  for insert with check (
    exists (
      select 1 from public.study_profiles sp
      where sp.id = study_profile_id and sp.user_id = auth.uid()
    )
  );

drop policy if exists "Users update their own study_profile_disciplines"
  on public.study_profile_disciplines;
create policy "Users update their own study_profile_disciplines"
  on public.study_profile_disciplines
  for update using (
    exists (
      select 1 from public.study_profiles sp
      where sp.id = study_profile_id and sp.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.study_profiles sp
      where sp.id = study_profile_id and sp.user_id = auth.uid()
    )
  );

drop policy if exists "Users delete their own study_profile_disciplines"
  on public.study_profile_disciplines;
create policy "Users delete their own study_profile_disciplines"
  on public.study_profile_disciplines
  for delete using (
    exists (
      select 1 from public.study_profiles sp
      where sp.id = study_profile_id and sp.user_id = auth.uid()
    )
  );

-- =============================================================================
-- SEED: 16 disciplinas do edital MP-ES (Cientista de Dados)
-- Módulo I = Básicas, Módulo II = Específicas
-- =============================================================================
insert into public.disciplines (slug, name, short_name, module, ordem, cor_hex, icone) values
  ('portugues',     'Português',                                          'Português',    'Módulo I - Básicas',     10, '#3b82f6', 'book-open-text'),
  ('raciocinio',    'Raciocínio Lógico-Matemático',                       'RLM',          'Módulo I - Básicas',     20, '#8b5cf6', 'brain'),
  ('legisMP',       'Legislação e Código de Ética do MPES',               'Legis MPES',   'Módulo I - Básicas',     30, '#ef4444', 'gavel'),
  ('mlSup',         'Machine Learning Supervisionado',                    'ML Sup.',      'Módulo II - Específicas', 40, '#10b981', 'bot'),
  ('mlNsup',        'Machine Learning Não-Supervisionado',                'ML N-Sup.',    'Módulo II - Específicas', 50, '#14b8a6', 'layers'),
  ('deepLearning',  'Redes Neurais e Deep Learning',                      'Deep Learning','Módulo II - Específicas', 60, '#f59e0b', 'network'),
  ('probAlgLin',    'Probabilidade e Álgebra Linear',                     'Prob + AL',    'Módulo II - Específicas', 70, '#6366f1', 'sigma'),
  ('estatistica',   'Estatística e Inferência',                           'Estatística',  'Módulo II - Específicas', 80, '#0ea5e9', 'bar-chart-3'),
  ('visualizacao',  'Visualização e Storytelling',                        'Viz',          'Módulo II - Específicas', 90, '#ec4899', 'pie-chart'),
  ('bdRelacional',  'Banco de Dados Relacionais',                         'BD Rel.',      'Módulo II - Específicas',100, '#f97316', 'database'),
  ('dwBi',          'Data Warehousing e Business Intelligence',           'DW / BI',      'Módulo II - Específicas',110, '#84cc16', 'package'),
  ('geoespacial',   'Geoprocessamento e Análise Espacial',                'Geoespacial',  'Módulo II - Específicas',120, '#22c55e', 'map'),
  ('gestaoProjTI',  'Gestão de Projetos de TI',                           'Gestão TI',    'Módulo II - Específicas',130, '#a855f7', 'kanban-square'),
  ('iaGen',         'IA Generativa e LLMs',                               'IA Gen.',      'Módulo II - Específicas',140, '#d946ef', 'sparkles'),
  ('laudos',        'Laudos e Documentação Técnica',                      'Laudos',       'Módulo II - Específicas',150, '#64748b', 'file-text'),
  ('leiEtica',      'Legislação e Aspectos Éticos (LGPD, Bioética, etc.)','LGPD + Ética', 'Módulo II - Específicas',160, '#dc2626', 'shield')
on conflict (slug) do update set
  name       = excluded.name,
  short_name = excluded.short_name,
  module     = excluded.module,
  ordem      = excluded.ordem,
  cor_hex    = excluded.cor_hex,
  icone      = excluded.icone;
