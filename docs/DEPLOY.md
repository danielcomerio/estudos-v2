# Deploy — Vercel + Supabase

## 1. Pré-requisitos

- Repositório no GitHub (já existe: `github.com/danielcomerio/estudos-v2`).
- Projeto Supabase criado e com as 7 migrations aplicadas
  ([SCHEMA.md](./SCHEMA.md) tem o passo a passo).
- Conta Vercel gratuita.

## 2. Antes de clicar "Deploy"

Na sua máquina:

```bash
# Confere que o build passa local
npm run build
```

Se falhar com erro de tipos depois de mudar schema, rode primeiro:

```bash
npm run db:types
git add src/types/database.ts
git commit -m "chore: regenera types"
```

Verifique `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

E que `.env.local` está no `.gitignore` (está — testado em check-ignore).

## 3. Vercel

1. Abra <https://vercel.com/new> → **Import Project** → escolha
   `danielcomerio/estudos-v2`.
2. Framework: **Next.js** (detectado automaticamente).
3. Root Directory: (padrão, raiz do repo).
4. **Environment Variables** — adicione as três **em todos os environments**
   (Production, Preview, Development):
   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | (URL do seu projeto Supabase) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (anon key) |
   | `SUPABASE_SERVICE_ROLE_KEY` | (service_role key — **NUNCA** exponha em código cliente) |
5. Clique **Deploy**.

Demora ~2–3 min no primeiro deploy. Ao fim, Vercel dá uma URL tipo
`https://estudos-v2-xxxxx.vercel.app`.

## 4. Configurar o Supabase para aceitar a URL de produção

Em <https://supabase.com/dashboard> → seu projeto → **Authentication → URL
Configuration**:

1. **Site URL**: `https://estudos-v2-xxxxx.vercel.app` (a URL de produção, sem
   trailing slash).
2. **Redirect URLs**: adicione:
   - `https://estudos-v2-xxxxx.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (pra continuar desenvolvendo local)
3. **Save**.

Se você tiver domínio custom depois, adiciona ele também nessas duas listas.

## 5. Smoke test em produção

1. Abre a URL. Deve redirecionar para `/login`.
2. Cria uma conta (ou entra com a que já usa em dev — note que se os projetos
   Supabase forem o mesmo, a conta é a mesma).
3. Confirma que:
   - [ ] `/onboarding` aparece se for conta nova e cria o study_profile.
   - [ ] `/dashboard` carrega com os contadores zerados.
   - [ ] `/banco/importar` aceita um JSON de teste e mostra a validação.
   - [ ] Iniciar um `/praticar` curto (5 questões aleatórias) — confirma que
         uma questão renderiza, você responde, salva attempt, e vê rating FSRS.
   - [ ] PWA: em Chrome desktop, DevTools → Application → Manifest deve mostrar
         nome, ícone dinâmico e shortcuts. Botão "Install" aparece no URL bar.
         No mobile, Menu → "Adicionar à tela inicial" funciona.

## 6. Deploys seguintes

```bash
git push origin main
```

Vercel monitora o `main` e faz deploy automático. Cada PR ganha um preview
automático com URL própria.

## 7. Variáveis do Supabase que NÃO podem vazar

- `SUPABASE_SERVICE_ROLE_KEY` — acesso total ao banco, bypassa RLS.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — ok ser pública (é o modelo do Supabase),
  mas jamais comite a `.env.local`.

Se suspeitar que vazou, vá em Dashboard → Settings → API → **Reset** e atualize
no Vercel + localmente.
