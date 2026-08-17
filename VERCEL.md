# Vercel

Four separate projects, one GitHub repo (`rujealfon/nuxt-app`). Each has its own Root Directory, env, domains, and rollback.

| Project | Root Directory | Runtime | Serves |
| --- | --- | --- | --- |
| `nuxt-app-web` | `apps/web` | Static (`nuxt generate`) | Marketing site |
| `nuxt-app-app` | `apps/app` | Nuxt SPA (`ssr: false`) | Logged-in product |
| `nuxt-app-admin` | `apps/admin` | Nuxt SPA | Admin |
| `nuxt-app-api` | `apps/api` | Hono on Node (Fluid Compute) | Auth, sessions, DB |

Custom domains (attach when DNS is ready):

- `nuxt-app.com` → web
- `app.nuxt-app.com` → app
- `admin.nuxt-app.com` → admin
- `api.nuxt-app.com` → api
- `COOKIE_DOMAIN=.nuxt-app.com`

`*.vercel.app` URLs work for a first smoke test. Cross-subdomain cookies match the README only after those custom domains are attached.

## Already done

- Projects exist: `nuxt-app-web`, `nuxt-app-app`, `nuxt-app-admin`, `nuxt-app-api`.
- Nitro: `layers/base` uses `vercel` when `VERCEL` is set, `node-server` otherwise. `apps/web` still overrides to `static`.
- Redis: `connectRedis()` is lazy and coalesced. Rate limiting works when Vercel serves `src/app.ts` and never runs `src/index.ts`.
- Vercel entry for the API is `src/app.ts` (`export default app`). Do not use `apps/api` `build` (`tsc`) as the Vercel build command.

Migrations do **not** run on API boot on Vercel. Apply them from your machine (or a production-only API build hook). See [Migrate](#migrate).

## Project settings

Each app owns its settings in `apps/<name>/vercel.json` (picked up because Root Directory is that folder). Leave dashboard **Override** toggles (Build / Output / Install / Development) off so the files win. Leave **Include files outside the Root Directory** on (pnpm workspaces need `layers/*` and `packages/*`). Node **24.x**. Install stays the default (`pnpm install` from the repo root).

| App | File | Framework | Build | Output |
| --- | --- | --- | --- | --- |
| web | `apps/web/vercel.json` | `nuxtjs` | `pnpm build` (`nuxt generate`) | `.output/public` |
| app | `apps/app/vercel.json` | `nuxtjs` | `pnpm build` (`nuxt build`) | default (Nitro `vercel` → `.vercel/output`) |
| admin | `apps/admin/vercel.json` | `nuxtjs` | `pnpm build` (`nuxt build`) | default |
| api | `apps/api/vercel.json` | `hono` | empty (do not run `tsc`) | default — Vercel bundles `src/app.ts` |

`ignoreCommand` is `npx turbo-ignore` in every file. That skips a project when that package and its workspace deps did not change.

Do **not** copy web’s `outputDirectory` onto app/admin. Those are `nuxt build` + the Vercel Nitro preset, not a static `generate`.

### Dashboard Framework Preset

`vercel.json` does **not** replace the Framework Preset dropdown. A project created in this monorepo often saves as **Nuxt**. That stored preset still injects Nuxt build hooks (`nuxt build`, `nuxt dev`, Nitro output) even when `apps/api/vercel.json` says `hono`.

On each project: **Settings → Build and Deployment → Framework Preset**:

| Project | Framework Preset |
| --- | --- |
| `nuxt-app-web` | Nuxt |
| `nuxt-app-app` | Nuxt |
| `nuxt-app-admin` | Nuxt |
| `nuxt-app-api` | **Hono** |

If `nuxt-app-api` still shows Nuxt, switch it to Hono, save, and redeploy. Leave the four Override toggles off.

After linking locally:

```bash
vercel link --repo
```

That writes `.vercel/repo.json`. Run later `vercel` commands from the app directory (`apps/api`, etc.) so it does not ask which project.

## Postgres + Redis (API only)

Schema needs **Postgres 18** (`uuidv7()`) and `pgcrypto` (`nanoid()`). Redis is TCP (`REDIS_URL` + `node-redis`), not the Upstash REST SDK.

On the **API** project (Vercel Marketplace):

1. Storage → Create Database → Neon. Pick Postgres 18. Put the **pooled** (`…-pooler…`) URL in the API’s `DATABASE_URL`.
2. Storage → Create Database → Upstash Redis. Put the TCP `rediss://…` URL in `REDIS_URL`. Keep the existing `node-redis` client.

## Env vars

Set on each project (Production + Preview). Projects do not inherit each other’s vars.

**`nuxt-app-api`**

| Name | Production |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** URL (runtime) |
| `REDIS_URL` | Upstash `rediss://…` |
| `NODE_ENV` | `production` (Vercel usually sets this) |
| `API_URL` | `https://api.nuxt-app.com` (or the API `*.vercel.app` URL until DNS is ready) |
| `APP_URL` | `https://app.nuxt-app.com` |
| `ADMIN_URL` | `https://admin.nuxt-app.com` |
| `WEB_URL` | `https://nuxt-app.com` |
| `COOKIE_DOMAIN` | `.nuxt-app.com` on custom domains; omit on `*.vercel.app` previews |
| `LOG_LEVEL` | `info` |

`APP_URL` / `ADMIN_URL` / `WEB_URL` are the CORS + CSRF allowlist. Exact origin: `https`, no trailing slash.

**`nuxt-app-app` and `nuxt-app-admin`**

| Name | Value |
| --- | --- |
| `NUXT_PUBLIC_API_URL` | `https://api.nuxt-app.com` |

Baked in at **build** time (`layers/auth` `runtimeConfig.public.apiUrl`). Change it, then redeploy those two projects.

**`nuxt-app-web`:** none unless the marketing site later calls the API.

Preview: either Preview-scoped URL vars, or preview frontends call the production API until you add per-preview CORS origins.

## Custom domains

Settings → Domains on each project:

| Domain | Project |
| --- | --- |
| `nuxt-app.com` + `www` | `nuxt-app-web` |
| `app.nuxt-app.com` | `nuxt-app-app` |
| `admin.nuxt-app.com` | `nuxt-app-admin` |
| `api.nuxt-app.com` | `nuxt-app-api` |

Add the DNS records Vercel shows. Then set `COOKIE_DOMAIN=.nuxt-app.com` on the API and redeploy it.

Until DNS is live: use the four `*.vercel.app` URLs, leave `COOKIE_DOMAIN` unset, and put those exact origins in `APP_URL` / `ADMIN_URL` / `WEB_URL` / `NUXT_PUBLIC_API_URL`.

## Migrate

`pnpm db:migrate` (repo root) runs `tsx apps/api/src/db/migrate.ts`. It loads repo-root `.env`, then `apps/api/.env`. A shell `DATABASE_URL` wins.

Use Neon’s **direct** host (no `-pooler`). Migrations take a lock; the pooler can hang. Keep the pooler URL for the running API.

```bash
DATABASE_URL='postgres://USER:PASS@ep-xxx.region.aws.neon.tech/neondb?sslmode=require' \
  pnpm db:migrate

DATABASE_URL='postgres://USER:PASS@ep-xxx.region.aws.neon.tech/neondb?sslmode=require' \
  pnpm db:seed
```

`drizzle-kit` / `tsx` do not load Vercel env files. Pass `DATABASE_URL` on the command line.

Do **not** migrate on every preview deploy against the production database. Unreviewed branch SQL would land on prod. A Vercel rollback restores functions, not schema.

Acceptable: production-only API build hook, additive migrations, direct `DATABASE_URL` at build time. Safest: migrate from your machine (or CI) against prod, then deploy. First Neon stand-up and anything destructive (`DROP` / rename) stay off the preview build.

Local Compose:

```bash
docker compose up postgres -d
pnpm db:migrate
```

## Deploy order

1. API (env vars set).
2. `https://<api>/health`.
3. Migrate + seed if the database is new or migrations changed.
4. app, admin, web.

Git pushes then deploy all four. `turbo-ignore` skips unchanged packages.

## Smoke test

1. Open web → page loads (static, no Node server).
2. Open app `/register` → create a user → lands logged in.
3. `GET https://<api>/auth/me` in that browser session returns the user (`nuxt_app_session`, httpOnly).
4. Open admin → same cookie works on `*.nuxt-app.com` with `COOKIE_DOMAIN` set. Promote with `pnpm db:seed` or `UPDATE users SET role = 'admin' …`.
5. Wrong-origin request to the API is rejected (CORS/CSRF).
6. Hit login ~11 times quickly → 429 from the Redis limiter.

## Gotchas

- Postgres must be 18. Neon 17 fails the first migration (`uuidv7()`).
- API Vercel build stays empty. `tsc` is not the platform entry.
- Runtime `DATABASE_URL` is the Neon **pooler**. If the pool is exhausted, set `max: 1` on the `pg` Pool.
- SPA deep links work because Nitro/Vercel serves the fallback. web is fully static.
- Four projects = four preview URLs per PR. Nothing wires “this preview app talks to that preview API” unless you set Preview env vars.
