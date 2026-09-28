# lida-thiry

Next.js (App Router) + TypeScript + Tailwind CSS, gekoppeld aan Supabase.

## Stack

- **Next.js 16** (App Router, `src/`-directory, import-alias `@/*`)
- **React 19**, **TypeScript**, **Tailwind CSS v4**
- **Supabase** via `@supabase/ssr` (browser-, server- en middleware-clients)
- Deploy op **Vercel** (auto-deploy op push naar de productiebranch)

## Lokaal ontwikkelen

```bash
cp .env.example .env.local   # env-variabelen staan er al in
npm install
npm run dev                  # http://localhost:3000
```

## Belangrijke bestanden

- `src/lib/supabase/client.ts` — Supabase-client voor Client Components
- `src/lib/supabase/server.ts` — Supabase-client voor Server Components / Route Handlers / Server Actions
- `src/lib/supabase/middleware.ts` + `src/middleware.ts` — sessie-verversing per request
- `src/app/status/page.tsx` — controleert de Supabase-verbinding

## Infrastructuur

- **Supabase**: project `lida-thiry`, ref `hzuhkollroehnrsghyax`, regio `eu-central-1`
- **Vercel**: project `hylke-s-projects/lida-thiry`, gekoppeld aan deze GitHub-repo

Env-variabelen (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) staan in
zowel Vercel (production/preview/development) als `.env.local`.
