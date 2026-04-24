# Troubleshooting

## `npm run dev` crasha com erro de env

**Sintoma**: tela em branco ou erro tipo `Invalid URL` no terminal ou
`TypeError: Cannot read properties of undefined`.

**Causa**: `.env.local` ausente ou incompleto.

**Fix**:
```bash
cp .env.example .env.local
# preencha as três chaves em .env.local
```

## Login funciona mas o app fica em loop redirecionando

**Causa**: geralmente é um cliente Supabase sendo recriado dentro de um
`useEffect` ou passado como dep de `useQuery`. Era o bug da v1, reescrevemos
exatamente pra evitar isso.

**Fix**: sempre importe `getSupabaseClient` de `@/lib/supabase/client` — é um
singleton módulo-level. NUNCA faça `const supabase = createBrowserClient(...)`
dentro de um componente.

## "disciplina_id 'X' não encontrada" na importação

**Causa**: o slug não é nem um dos 5 canônicos nem um legado mapeado, e não
existe UUID correspondente na tabela `disciplines`.

**Fix**: use um destes slugs canônicos:
- `portugues`
- `legislacao_mp`
- `estatistica`
- `banco_de_dados`
- `inteligencia_artificial`

Ou um dos legados que são auto-mapeados (`bdRelacional`, `mlSup`, `leiEtica`,
etc. — veja `src/lib/validators/slug-mapping.ts`).

## `/comunidade` tá vazio mesmo com questão pública

**Causa 1**: a view `public_questions_feed` só mostra questões com
`quality_score >= 0`. Questões novas começam com 0 (OK). Se alguém deu thumbs
down, o score pode ter ficado negativo.

**Causa 2**: você publicou uma questão forked? A tela `/banco` bloqueia mudar
visibility de questões com `origem='forked'` — aparentemente essa foi a
intenção.

## PWA não aparece como instalável

Checklist:
- Rodou `npm run build` (o SW só é gerado em produção; em dev está desabilitado
  por config).
- Está em HTTPS (Vercel dá isso de graça) — PWA não instala em HTTP (exceto
  localhost).
- Em Chrome DevTools → Application → Manifest, não há erros em vermelho.
- Ícones carregam. `/icon` e `/apple-icon` são rotas dinâmicas (next/og).
  Se o domínio não tem `next/og` disponível (edge runtime), elas não carregam.

## Erro 401 em `/api/questions/import`

**Causa**: cookies do Supabase não chegaram na rota. Geralmente é sessão
expirada.

**Fix**: recarregue a página (a middleware vai redirecionar pra /login se de
fato não há sessão) ou faça logout/login.

## `npm run db:types` falha

**Causa**: `SEU_PROJECT_ID` não foi substituído pelo ref real, ou você não está
logado no CLI do Supabase.

**Fix**:
```bash
# Em package.json, o script db:types precisa do --project-id correto.
# Confira em Dashboard → Settings → General → Reference ID.
npx supabase login
npx supabase gen types typescript --project-id <REF> --schema public > src/types/database.ts
```

## `npm run build` reclama do withPWA

**Sintoma**: erro tipo `PluginOptions`, `skipWaiting does not exist`.

**Causa**: próximo versão do `@ducanh2912/next-pwa` mudou o shape da config.

**Fix**: `skipWaiting`, `clientsClaim`, `disableDevLogs` vão DENTRO de
`workboxOptions`, não no top-level. Nosso `next.config.ts` já faz isso certo.

## Simulado finalizado com pontuação zerada

**Causa**: `study_profile_disciplines.pontos_por_questao` está null/0 pras
disciplinas. A pontuação = `Σ acertos × pontos_por_questao`.

**Fix**: volte em `/onboarding` (acessível via query-string `?redo` se quiser
reeditar — ou edite diretamente a row em SQL) e preencha os pontos.
