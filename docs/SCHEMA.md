# Schema — estudos-v2

Fonte única da verdade do schema Postgres. Migrations SQL vivem em
[`supabase/migrations/`](../supabase/migrations/), em ordem numérica; cada arquivo é
**idempotente** (pode rodar duas vezes sem erro).

## Como aplicar as migrations

**Opção A — SQL Editor do Supabase (manual, recomendada agora)**

1. Abre <https://supabase.com/dashboard> → seu projeto → **SQL Editor**.
2. Para cada arquivo em `supabase/migrations/`, em ordem (`01_…` → `07_…`):
   - Copia o conteúdo.
   - Cola no SQL Editor.
   - Clica **Run**.
   - Confirma que o resultado é *Success. No rows returned* (ou com algum *INSERT 0 N* nas migrations com seed).
3. Rodou tudo? Confere em **Table Editor** que as tabelas abaixo aparecem no schema `public`.

**Opção B — Supabase CLI (quando quisermos CI)**

```bash
npx supabase link --project-ref <SEU_PROJECT_REF>
npx supabase db push
```

Deixamos para depois — hoje cola-e-roda é mais rápido.

## Gerar os types TypeScript

Depois que as migrations estão aplicadas:

```bash
# Uma vez: pegue o project-id em Dashboard → Settings → General → Reference ID
npm run db:types
```

Isso escreve `src/types/database.ts` a partir do schema real do Supabase. Todos os
clients (browser/server) vão passar a ser tipados como `SupabaseClient<Database>`.

> O script vive em `package.json` (`"db:types"`). Antes de rodar pela primeira vez,
> substitui `SEU_PROJECT_ID` pelo seu ref real no script.

## Diagrama das tabelas

```
auth.users                (managed by Supabase Auth)
  │
  ├─► profiles            1:1    tier, credits, handle, api_key_encrypted
  │
  ├─► study_profiles      1:N    um por concurso que você estuda
  │     │
  │     └─► study_profile_disciplines  (config por disciplina: cota, peso, pontos)
  │
  ├─► questions           1:N    banco de objetivas (soft-delete, visibility)
  │     │        └─► forked_from (self-ref)
  │     │
  │     ├─► reviews       1:1 por (user, question) — estado FSRS
  │     ├─► attempts      1:N    cada resposta
  │     ├─► question_feedback   +1/-1 em question|explanation
  │     └─► question_comments   threads (parent_comment_id self-ref)
  │
  ├─► discursives         1:N    banco de discursivas
  │     └─► disc_attempts 1:N    cada resposta
  │
  ├─► simulado_templates  1:N    configs salvas
  │     └─► simulados     1:N    instâncias executadas
  │
  ├─► study_sessions      1:N    sessões de praticar (agrupam attempts)
  │
  └─► reports             polimórfico (target_type + target_id)

disciplines               (global, read-all, service_role write)
  └─► topics              (hierarchical: parent_topic_id self-ref)
```

## Tabelas — resumo por migration

### 01 — `auth_and_profiles`
| Tabela | Descrição | RLS |
| --- | --- | --- |
| `profiles` | 1:1 com `auth.users`; tier, créditos, handle público, `anthropic_api_key_encrypted` | own + "Anyone reads public profiles" |
| `study_profiles` | N por usuário (um por concurso); `config` jsonb; partial unique index para um default por usuário | own |

- Trigger `on_auth_user_created` (em `auth.users`) → insere linha em `profiles`.
- Função `handle_updated_at()` compartilhada entre todas as tabelas com `updated_at`.

### 02 — `disciplines_and_topics`
| Tabela | Descrição | RLS |
| --- | --- | --- |
| `disciplines` | 16 disciplinas do MP-ES seedadas (3 básicas + 13 específicas) | read-all, service_role write |
| `topics` | Subtópicos (hierárquicos via `parent_topic_id`) | read-all + authenticated insert |
| `study_profile_disciplines` | Config por disciplina dentro de um study_profile | via EXISTS no study_profile |

O seed usa `ON CONFLICT (slug) DO UPDATE`, então re-rodar a migration 02 sincroniza
qualquer tweak em nome/cor/ícone com os valores canônicos deste arquivo.

### 03 — `questions_and_discursives`
| Tabela | Descrição | RLS |
| --- | --- | --- |
| `questions` | Objetivas, soft-delete, visibility, origem, quality_score | own + "Anyone reads public" |
| `discursives` | Discursivas (texto_base, comando, quesitos jsonb, rubrica jsonb, espelho) | own + "Anyone reads public" |

- `questions` tem partial unique `(user_id, enunciado_hash) WHERE deleted_at IS NULL` para dedupe.
- `forked_from` aponta pra outra questão (self-ref, `ON DELETE SET NULL`).

### 04 — `fsrs_and_attempts`
| Tabela | Descrição | RLS |
| --- | --- | --- |
| `reviews` | Estado FSRS v5 por `(user, question)`, `unique(user_id, question_id)` | own |
| `attempts` | Tentativas de objetivas; rating 1..4 (Again/Hard/Good/Easy), confianca 1..5 | own |
| `disc_attempts` | Tentativas de discursivas; `auto_avaliacao`/`avaliacao_ai` jsonb | own |

> **Nota**: `attempts.session_id` e `attempts.simulado_id` (mesma coisa para
> `disc_attempts`) são plain uuid **sem FK**. Os parents vivem na migration 05
> (ordem de aplicação) e a integridade é garantida na camada de aplicação. Se
> um dia quisermos bancar esse custo, basta `ALTER TABLE … ADD CONSTRAINT …`
> numa migration futura.

### 05 — `simulados_and_sessions`
| Tabela | Descrição | RLS |
| --- | --- | --- |
| `simulado_templates` | Configs reutilizáveis (cotas, dif range, criterio_selecao); um default por usuário | own |
| `simulados` | Instâncias executadas; `questoes_ids uuid[]`, `flags uuid[]`, status em_andamento/finalizado/abandonado | own |
| `study_sessions` | Sessões de praticar que agrupam `attempts`; modo aleatorio/ordem/fsrs/repetir_erradas | own |

### 06 — `feedback_and_community`
| Tabela | Descrição | RLS |
| --- | --- | --- |
| `question_feedback` | `+1/-1` em question \| explanation; unique por `(user, question, target)` | own; autor da questão lê tudo |
| `question_comments` | Threaded, soft-delete; visibilidade segue a questão | via EXISTS na `questions` |
| `reports` | Polimórfico (`target_type` + `target_id`); staff modera via service_role | reporter lê próprio |

- Trigger `recalc_quality_on_feedback` mantém `questions.quality_score`,
  `total_feedback_positive` e `total_feedback_negative` em sincronia.

### 07 — `storage_and_rpcs`

**Buckets** (em `storage.buckets`):
| Bucket | Público? | Convenção de path | Policies |
| --- | --- | --- | --- |
| `backups` | não | `<snapshot_id>.json` | só service_role (via rota admin) |
| `disc_images` | não | `<user_uuid>/<nome>` | user-scoped por folder prefix |
| `avatars` | sim (read) | `<user_uuid>/avatar.png` | read-all, write user-scoped |

### RPCs

| Nome | Descrição |
| --- | --- |
| `get_profile_disciplines(p_study_profile_id uuid)` | Disciplinas configuradas no perfil, com cota/pesos/pontos, ordenadas por `ordem`. |
| `get_due_questions(p_study_profile_id uuid, p_limit int default 20)` | Questões FSRS-due (ou nunca revisadas) para o caller. Oldest due first. |
| `consume_credits(p_amount int)` | Debita créditos, auto-reset diário, transacional (SELECT FOR UPDATE). Retorna `jsonb {ok, used, allowance, reason?}`. |
| `fork_question(p_question_id uuid)` | Clona uma questão pública para o banco privado do caller com `origem='forked'` e `forked_from=<source>`. Retorna o UUID da nova questão. |

### Views

| View | Descrição |
| --- | --- |
| `public_questions_feed` | Feed da comunidade: `questions` públicas + not deleted + quality_score ≥ 0, com join em `profiles` para `author_handle/name`. `security_invoker = true` para respeitar RLS. |
| `user_statistics` | Uma linha de contadores para `auth.uid()`: `total_questions`, `total_attempts`, `total_correct`, `due_now`, `total_discursives`, `total_disc_attempts`. `security_invoker = true`. |

## Padrões que valem em todo o schema

- **UUIDs**: toda PK é `uuid default gen_random_uuid()` (ou references `auth.users(id)` para 1:1).
- **Auditoria**: `created_at` e `updated_at` (quando relevante) com defaults e trigger.
- **Soft-delete**: `deleted_at timestamptz` em `questions`, `discursives`, `question_comments`.
- **RLS**: habilitado em toda tabela com dados de usuário. Policies nomeadas no formato
  `Users <verbo> their own <tabela>` + variantes para leitura pública.
- **Idempotência**: `create table if not exists`, `create index if not exists`,
  `drop policy if exists` antes de `create policy`, `create or replace function`,
  `drop trigger if exists` antes de `create trigger`, seeds via `on conflict`.

## Próximos passos

1. Aplicar as 7 migrations no Supabase.
2. Rodar `npm run db:types` (depois de preencher o `<SEU_PROJECT_ID>` no script).
3. Na sessão 3, tipar os clients Supabase com `Database` e começar o fluxo de auth
   real (signup, login, logout) — os stubs de `(auth)/login` e `(auth)/signup` estão
   prontos.
