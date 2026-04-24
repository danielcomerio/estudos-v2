# estudos-v2

App de preparação para o concurso **MP-ES — Cientista de Dados (FGV, prova 31/05/2026)**.
Segunda iteração do projeto, reescrito do zero para evitar os bugs (loops infinitos, desinc
de dados) da versão anterior.

## Stack

- **Next.js 15** (App Router, TypeScript strict, Tailwind v4)
- **Supabase** (`@supabase/ssr`) — banco + auth com cookies SSR
- **TanStack Query v5** — cache e sincronização de fetches (sem `useEffect` + `useState` manuais)
- **shadcn/ui** (preset `base-nova`, Base UI sob o capô) + **lucide-react** + **sonner**
- **Zod** + **react-hook-form** — validação cliente+servidor
- **ts-fsrs v5** — algoritmo de repetição espaçada para o módulo de revisão
- **date-fns** — datas
- **`@ducanh2912/next-pwa`** — PWA (configurado na sessão 5)

## Rodando localmente

1. **Pré-requisitos**: Node ≥ 20, npm.
2. **Dependências**:
   ```bash
   npm install
   ```
3. **Variáveis de ambiente**: copie `.env.example` para `.env.local` e preencha:
   ```bash
   cp .env.example .env.local
   ```
   As três chaves vêm de [Supabase Dashboard → Project → Settings → API](https://supabase.com/dashboard):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only, nunca exponha)
4. **Dev server**:
   ```bash
   npm run dev
   ```
   Abra <http://localhost:3000>.

## Scripts úteis

| Comando                | O que faz                 |
| ---------------------- | ------------------------- |
| `npm run dev`          | Dev server Next.js        |
| `npm run build`        | Build de produção         |
| `npm run start`        | Serve o build de produção |
| `npm run lint`         | ESLint                    |
| `npm run typecheck`    | `tsc --noEmit`            |
| `npm run format`       | Prettier write            |
| `npm run format:check` | Prettier check            |

## Deploy

Plano: **Vercel** (free tier) + **Supabase** (free tier).

- Conectar o repo GitHub na Vercel.
- Configurar as três env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- `main` → produção.

## Estrutura

```
src/
  app/
    (auth)/          login, signup
    (app)/           rotas autenticadas (dashboard, banco, praticar, ...)
    api/             rotas de API
  components/
    ui/              shadcn/ui
    layout/ forms/ cards/
  hooks/
  lib/
    supabase/        cliente browser (singleton), server, middleware
    validators/      schemas Zod
    fsrs/            wrapper ts-fsrs
    utils.ts
  types/
```

## Documentação

Mais docs do projeto vão aparecer em [`docs/`](./docs/) conforme o app cresce (esquema do
banco, contratos de API, decisões de arquitetura).
