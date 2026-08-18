# Vercel

Four separate projects, one GitHub repo (`rujealfon/nuxt-app`). Each has its own Root Directory, env, domains, and rollback.

| Project          | Root Directory | Runtime                      | Serves             |
| ---------------- | -------------- | ---------------------------- | ------------------ |
| `nuxt-app-web`   | `apps/web`     | Static (`nuxt generate`)     | Marketing site     |
| `nuxt-app-app`   | `apps/app`     | Nuxt SPA (`ssr: false`)      | Logged-in product  |
| `nuxt-app-admin` | `apps/admin`   | Nuxt SPA                     | Admin              |
| `nuxt-app-api`   | `apps/api`     | Hono on Node (Fluid Compute) | Auth, sessions, DB |

Custom domains (attach when DNS is ready):

- `nuxt-app.com` → web
- `app.nuxt-app.com` → app
- `admin.nuxt-app.com` → admin
- `api.nuxt-app.com` → api
- `COOKIE_DOMAIN=.nuxt-app.com`

`*.vercel.app` URLs work for a first smoke test. Cross-subdomain cookies match [apps/api/README.md](apps/api/README.md) only after those custom domains are attached.

## Already done

- Projects exist: `nuxt-app-web`, `nuxt-app-app`, `nuxt-app-admin`, `nuxt-app-api`.
- Nitro: `layers/base` uses `vercel` when `VERCEL` is set, `node-server` otherwise. `apps/web` still overrides to `static`.
- Redis: `connectRedis()` is lazy and coalesced. Rate limiting works when Vercel serves `src/app.ts` and never runs `src/index.ts`.
- Vercel entry for the API is `src/app.ts` (`export default app`). Do not use `apps/api` `build` (`tsc`) as the Vercel build command. The API `buildCommand` is `pnpm db:migrate`.

Migrations do **not** run on API boot on Vercel. Production and preview API builds run `pnpm db:migrate`. Preview must use a different database than production. See [Migrate](#migrate).

## Project settings

Each app owns its settings in `apps/<name>/vercel.json` (picked up because Root Directory is that folder). Leave dashboard **Override** toggles (Build / Output / Install / Development) off so the files win. Leave **Include files outside the Root Directory** on (pnpm workspaces need `layers/*` and `packages/*`). Node **24.x**. Nuxt presets detect `pnpm-lock.yaml` at the repo root. The Hono preset does not — `apps/api/vercel.json` sets `installCommand` to `pnpm install --frozen-lockfile` so npm never sees `workspace:*`. App/admin/web `buildCommand` runs `nuxt prepare` in the shared layers so Vite can resolve `layers/*/.nuxt/tsconfig.json` (that folder is gitignored and is not created by the app’s own prepare). CI/`turbo run build` does the same via `^nuxt:prepare` instead of a per-app `prebuild`, so parallel app builds do not race on `layers/*/.nuxt`.

| App   | File                     | Framework | Build                                                 | Output                                      |
| ----- | ------------------------ | --------- | ----------------------------------------------------- | ------------------------------------------- |
| web   | `apps/web/vercel.json`   | `nuxtjs`  | layer `nuxt:prepare` + `pnpm build` (`nuxt generate`) | `.output/public`                            |
| app   | `apps/app/vercel.json`   | `nuxtjs`  | layer `nuxt:prepare` + `pnpm build` (`nuxt build`)    | default (Nitro `vercel` → `.vercel/output`) |
| admin | `apps/admin/vercel.json` | `nuxtjs`  | layer `nuxt:prepare` + `pnpm build` (`nuxt build`)    | default                                     |
| api   | `apps/api/vercel.json`   | `hono`    | `pnpm db:migrate` (not `tsc`)                         | default — Vercel bundles `src/app.ts`       |

Do **not** set `ignoreCommand` / Ignored Build Step to `npx turbo-ignore` (`turbo-ignore` is deprecated). Vercel [skips unaffected projects](https://vercel.com/docs/monorepos#skipping-unaffected-projects) when the commit does not change that package or its workspace deps. That path does not take a concurrent build slot. Leave **Skip deployment** enabled under Root Directory (the default). Leave Ignored Build Step empty.

Do **not** copy web’s `outputDirectory` onto app/admin. Those are `nuxt build` + the Vercel Nitro preset, not a static `generate`.

### Dashboard Framework Preset

`vercel.json` does **not** replace the Framework Preset dropdown. A project created in this monorepo often saves as **Nuxt**. That stored preset still injects Nuxt build hooks (`nuxt build`, `nuxt dev`, Nitro output) even when `apps/api/vercel.json` says `hono`.

On each project: **Settings → Build and Deployment → Framework Preset**:

| Project          | Framework Preset |
| ---------------- | ---------------- |
| `nuxt-app-web`   | Nuxt             |
| `nuxt-app-app`   | Nuxt             |
| `nuxt-app-admin` | Nuxt             |
| `nuxt-app-api`   | **Hono**         |

If `nuxt-app-api` still shows Nuxt, switch it to Hono, save, and redeploy. Leave the four Override toggles off.

After linking locally:

```bash
vercel link --repo
```

That writes `.vercel/repo.json`. Run later `vercel` commands from the app directory (`apps/api`, etc.) so it does not ask which project.

## Postgres + Redis (API only)

Schema needs **Postgres 18** (`uuidv7()`) and `pgcrypto` (`nanoid()`). Redis is TCP (`REDIS_URL` + `node-redis`), not the Upstash REST SDK.

On the **API** project (Vercel Marketplace):

1. Storage → Create Database → Neon. Pick Postgres 18. Put the **pooled** (`…-pooler…`) URL in the API’s `DATABASE_URL` and the **direct** (non-pooler) URL in `DATABASE_URL_UNPOOLED`.
2. Storage → Create Database → Upstash Redis. Put the TCP `rediss://…` URL in `REDIS_URL` (not `redis://`). Upstash endpoints enforce TLS (`TLS/SSL: Enabled` in the console); `redis://` will fail to connect. Keep the existing `node-redis` client.

## Env vars

Set on each project (Production + Preview). Projects do not inherit each other’s vars.

**`nuxt-app-api`**

| Name                    | Production                                                                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`          | Neon **pooled** URL (runtime), `sslmode=verify-full`                                                                                                                                                         |
| `DATABASE_URL_UNPOOLED` | Neon **direct** URL (migrations), `sslmode=verify-full`. Required when `DATABASE_URL` is a pooled endpoint. Must be available at **build** time. Preview scope must be a different database than Production. |
| `REDIS_URL`             | Upstash `rediss://…` (TLS). Do not use `redis://` — Upstash rejects it.                                                                                                                                      |
| `NODE_ENV`              | `production` (Vercel usually sets this)                                                                                                                                                                      |
| `API_URL`               | `https://api.nuxt-app.com` (or the API `*.vercel.app` URL until DNS is ready)                                                                                                                                |
| `APP_URL`               | `https://app.nuxt-app.com`                                                                                                                                                                                   |
| `ADMIN_URL`             | `https://admin.nuxt-app.com`                                                                                                                                                                                 |
| `WEB_URL`               | `https://nuxt-app.com`                                                                                                                                                                                       |
| `COOKIE_DOMAIN`         | `.nuxt-app.com` on custom domains; omit on `*.vercel.app` previews (app/admin use a same-origin `/__api` proxy so the cookie is first-party)                                                                 |
| `TRUST_PROXY`           | `true` (Vercel overwrites `X-Forwarded-For`)                                                                                                                                                                 |
| `LOG_LEVEL`             | `info`                                                                                                                                                                                                       |

`APP_URL` / `ADMIN_URL` / `WEB_URL` are the CORS + CSRF allowlist. Exact origin: `https`, no trailing slash.

**`nuxt-app-app` and `nuxt-app-admin`**

| Name                  | Value                      |
| --------------------- | -------------------------- |
| `NUXT_PUBLIC_API_URL` | `https://api.nuxt-app.com` |

Baked in at **build** time (`layers/auth` `runtimeConfig.public.apiUrl`). Change it, then redeploy those two projects.

**`nuxt-app-web`**

| Name                  | Value                      |
| --------------------- | -------------------------- |
| `NUXT_PUBLIC_APP_URL` | `https://app.nuxt-app.com` |

Baked into the static site at **generate** time (`runtimeConfig.public.appUrl`). Change it, then redeploy web. Falls back to `APP_URL` if unset.

Preview: either Preview-scoped URL vars, or preview frontends call the production API until you add per-preview CORS origins.

## Custom domains

Settings → Domains on each project:

| Domain                 | Project          |
| ---------------------- | ---------------- |
| `nuxt-app.com` + `www` | `nuxt-app-web`   |
| `app.nuxt-app.com`     | `nuxt-app-app`   |
| `admin.nuxt-app.com`   | `nuxt-app-admin` |
| `api.nuxt-app.com`     | `nuxt-app-api`   |

Add the DNS records Vercel shows. Then set `COOKIE_DOMAIN=.nuxt-app.com` on the API and redeploy it.

Until DNS is live: use the four `*.vercel.app` URLs, leave `COOKIE_DOMAIN` unset, and put those exact origins in `APP_URL` / `ADMIN_URL` / `WEB_URL` / `NUXT_PUBLIC_API_URL` / `NUXT_PUBLIC_APP_URL`. Each `*.vercel.app` hostname is its own site, so the app/admin clients call the API through a same-origin `/__api` proxy and the session cookie stays first-party (`SameSite=Lax`). After custom domains are attached, set `COOKIE_DOMAIN=.nuxt-app.com` so app and admin share the cookie on the parent domain.

## Migrate

`pnpm db:migrate` (repo root) runs `tsx apps/api/src/db/migrate.ts`. It loads repo-root `.env`, then `apps/api/.env`. A shell `DATABASE_URL_UNPOOLED` (then `DATABASE_URL`) wins. API boot also runs migrations locally and uses `DATABASE_URL_UNPOOLED` when set.

Vercel API builds (production and preview) run `pnpm db:migrate`. Mark `DATABASE_URL` and `DATABASE_URL_UNPOOLED` available at **build** time on `nuxt-app-api` (not Runtime-only). Set Preview-scoped URLs to a different Neon database (or branch) than Production.

Use Neon’s **direct** host (no `-pooler`) in `DATABASE_URL_UNPOOLED`. Migrations take a lock; the pooler can hang. Keep the pooler URL in `DATABASE_URL` for the running API.

```bash
DATABASE_URL_UNPOOLED='postgresql://USER:PASSWORD@ep-xxx.region.aws.neon.tech:5432/neondb?sslmode=verify-full' \
  pnpm db:migrate

DATABASE_URL='postgresql://USER:PASSWORD@ep-xxx.region.aws.neon.tech:5432/neondb?sslmode=verify-full' \
  ADMIN_PASSWORD='your-strong-password' \
  pnpm db:seed
```

`drizzle-kit` / `tsx` do not load Vercel env files. Pass `DATABASE_URL_UNPOOLED` on the command line for migrate/studio.

Preview deploys apply that branch’s SQL to the **preview** database. Do not point Preview `DATABASE_URL` / `DATABASE_URL_UNPOOLED` at production. A Vercel rollback restores functions, not schema.

Keep migrations additive. First Neon stand-up and anything destructive (`DROP` / rename) stay off the automatic hook — run those from your machine.

Local Compose:

```bash
docker compose up postgres -d
pnpm db:migrate
```

## Deploy order

1. API (env vars set).
2. `https://<api>/health`.
3. Confirm the API build applied migrations (`Running migrations...` / `Migrations completed.`). Seed if the database is new.
4. app, admin, web.

Git pushes then deploy all four. Vercel skips a project when that package and its workspace deps did not change.

## Smoke test

1. Open web → page loads (static, no Node server).
2. Open app `/register` → create a user → lands on `/login` (register does not start a session).
3. Sign in with that account → lands logged in.
4. `GET https://<api>/auth/me` in that browser session returns the user (`nuxt_app_session`, httpOnly).
5. Open admin → same cookie works on `*.nuxt-app.com` with `COOKIE_DOMAIN` set. Promote with `ADMIN_PASSWORD=... pnpm db:seed` (resets that account's password) or `UPDATE users SET role = 'admin' …`.
6. Wrong-origin request to the API is rejected (CORS/CSRF).
7. Hit login ~11 times quickly → 429 from the Redis limiter.

## Gotchas

- Postgres must be 18. Neon 17 fails the first migration (`uuidv7()`).
- API Vercel build is `pnpm db:migrate`, not `tsc`. `tsc` is not the platform entry. Preview must not share production `DATABASE_URL`.
- Hono does not detect the repo-root pnpm lockfile. Without `installCommand`, Vercel runs `npm install` and fails on `workspace:*`.
- Runtime `DATABASE_URL` is the Neon **pooler**. If the pool is exhausted, set `max: 1` on the `pg` Pool. Migrations use `DATABASE_URL_UNPOOLED` (required in production when `DATABASE_URL` is pooled). Neon URLs use `sslmode=verify-full` (`pg` already treats `require` as `verify-full` and warns).
- Upstash `REDIS_URL` must be `rediss://` (TLS). `redis://` is only for local Compose.
- SPA deep links work because Nitro/Vercel serves the fallback. web is fully static.
- Four projects = four preview URLs per PR. Nothing wires “this preview app talks to that preview API” unless you set Preview env vars.
