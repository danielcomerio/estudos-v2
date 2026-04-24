# estudos-v2

App de preparação para o concurso **MP-ES — Cientista de Dados (FGV, prova 31/05/2026)**.
Segunda iteração, reescrita do zero para evitar os loops infinitos da v1.

## Features

### Core de estudo
- **Importação em lote** de JSON com validação client+server (Zod), dedupe por
  hash do enunciado, criação automática de `topics`.
- **Banco de questões** com filtros (disciplina/tema/dificuldade/texto),
  paginação (`useInfiniteQuery`), soft-delete, controle de visibilidade.
- **Praticar** parametrizável: disciplinas, dificuldade, modo (aleatório /
  recentes / ordem / quality / FSRS due / repetir erradas), quantidade, timer
  por questão, rating FSRS opcional.
- **Revisar FSRS** com contadores (vencidas / novas / total) e sessão gerada
  automaticamente via a RPC `get_due_questions`.
- **Simulado** com templates reutilizáveis (preset "Oficial MP-ES" com cotas
  10/5/15/15/15 = 60q em 4h), cronômetro sticky, grid de navegação, flags,
  pontuação calculada via `study_profile_disciplines`.
- **Discursivas** com fluxo writing → evaluating → saved: espelho revelável,
  rubrica como inputs 0..pontos, checklist de conceitos-chave, notas da banca.
- **Feedback** thumbs up/down (questão / explicação), dialog com motivo +
  opção de soft-delete; trigger PG recalcula `quality_score` em tempo real.
- **Dashboard** com 4 StatCards, barras de acerto por disciplina (30d),
  últimos simulados, dias até a prova.

### Comunidade
- **Visibilidade** por questão (private / unlisted / public).
- **Feed `/comunidade`** (view `public_questions_feed`) com filtros e estrelas
  baseadas em quality_score.
- **Perfil público** `/u/[handle]` com bio + grid de questões públicas.
- **Fork** de questão pública (RPC `fork_question`) que clona pro seu banco
  privado com `origem='forked'`.
- **Config de perfil** (`/configuracoes/perfil-publico`): toggle, handle (regex
  validado), bio, display name.

### Admin / operacional
- **Reset de dados com backup automático**: monta JSON de tudo, sobe no bucket
  `backups/<user_id>/`, retorna URL assinada de 7 dias, e só então apaga.
  Preserva profile + study_profile pra não quebrar o onboarding.
- **Listagem de backups** com download via URL assinada de 24h.

### Plataforma
- **PWA**: manifest dinâmico (Next Metadata API), ícones gerados on-the-fly
  via `next/og`, SW gerado por `@ducanh2912/next-pwa` (desabilitado em dev),
  shortcuts para Praticar/Simulado/Revisar.
- **Auth**: email+senha, magic link, callback, middleware que redireciona
  unauth'd com `?next=<path>` pra voltar ao destino.

## Stack

- **Next.js 15** (App Router, TypeScript strict, Tailwind v4)
- **Supabase** (`@supabase/ssr`) — Postgres + Auth + Storage, com RLS em tudo
- **TanStack Query v5** — cache/invalidação de fetches (nenhum `useEffect +
  useState + refresh` manual)
- **shadcn/ui** (preset `base-nova`, Base UI) + **lucide-react** + **sonner**
- **Zod** + **react-hook-form**
- **ts-fsrs v5** — algoritmo de repetição espaçada
- **`@ducanh2912/next-pwa`** — service worker + workbox

## Rodando localmente

1. **Pré-requisitos**: Node ≥ 20, npm, conta Supabase.
2. Instala:
   ```bash
   npm install
   ```
3. Copia o template de env e preenche as três chaves do seu projeto Supabase
   (<https://supabase.com/dashboard> → Settings → API):
   ```bash
   cp .env.example .env.local
   ```
4. Aplique as 7 migrations (SQL Editor do Supabase, em ordem numérica —
   [`supabase/migrations/`](./supabase/migrations/)).
5. Atualize o `--project-id` no script `db:types` (package.json) e gere types:
   ```bash
   npm run db:types
   ```
6. Sobe o dev:
   ```bash
   npm run dev
   ```
   Abre <http://localhost:3000>.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Dev server (SW desabilitado) |
| `npm run build` | Build de produção (gera o SW) |
| `npm run start` | Serve o build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run format` / `format:check` | Prettier |
| `npm run db:types` | Regenera `src/types/database.ts` do schema real do Supabase |

## Docs

- [Guia de uso](./docs/GUIA_USO.md) — passo a passo desde criar conta até
  usar o dashboard.
- [Formato JSON](./docs/FORMATO_JSON.md) — schema de objetiva e discursiva
  com exemplos e erros comuns.
- [Schema do banco](./docs/SCHEMA.md) — tabelas, RLS, RPCs, views.
- [Deploy](./docs/DEPLOY.md) — passo a passo Vercel + Supabase.
- [Troubleshooting](./docs/TROUBLESHOOTING.md) — problemas comuns.

## Pendências conhecidas (vs. spec original)

- **Comentários em questões públicas**: schema existe (tabela
  `question_comments`) mas a UI ficou pra um ciclo futuro.
- **Geração via IA**: nem modo prompt nem API foram implementados — ficou
  fora do escopo das 5 sessões iniciais. Integração Claude API vai entrar
  em sessão dedicada.
- **Templates de simulado pré-criados**: a spec pedia 2 templates (Oficial
  MP-ES + Revisão rápida) auto-criados; hoje a gente tem **preset aplicável**
  no form de criar template (botão "Aplicar preset Oficial MP-ES") — mais
  explícito, e o form continua mostrando todos os campos.
- **Shuffle de alternativas** em simulado: flag existe no config jsonb, mas
  o QuestionCard preserva a ordem original sempre. Simples de adicionar
  quando virar prioridade.
- **Timer do simulado** reseta se fechar a aba: não persiste deadline.

## Arquitetura em uma imagem

```
src/
  app/
    (auth)/            login, signup
    (app)/             dashboard, banco, praticar, revisar, simulado,
                       discursivas, comunidade, configuracoes
    api/               questions/import, questions/fork, feedback,
                       admin/reset, admin/backups, auth/callback
    u/[handle]/        perfil público
    icon.tsx, apple-icon.tsx, manifest.ts
  components/
    ui/                shadcn/ui
    layout/            shell + nav + user menu
    cards/             QuestionCard, QuestionFeedback
    praticar/ simulado/ discursivas/ forms/
  hooks/               useUserData, useDisciplines
  lib/
    supabase/          client (singleton), server, middleware
    validators/        slug-mapping, questions, feedback
    fsrs/              wrapper ts-fsrs v5
    hash.ts            md5 server-only
    utils.ts
  types/               database.ts (gerado) + index.ts (domínio)
supabase/migrations/   01–07, idempotentes
docs/                  guia, formato, schema, deploy, troubleshooting
```
