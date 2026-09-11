# mysite

pnpm monorepo with four independently deployable Nuxt apps sharing common packages.

| App | Subdomain | Local port | Source |
| --- | --- | --- | --- |
| Web | `web.mysite.com` | 3000 | `apps/web` |
| App | `app.mysite.com` | 3001 | `apps/app` |
| Admin | `admin.mysite.com` | 3002 | `apps/admin` |
| API | `api.mysite.com` | 3003 | `apps/api` |

Shared packages:

| Package | Purpose |
| --- | --- |
| `@mysite/ui` | Nuxt layer: [Nuxt UI](https://ui.nuxt.com/) components, theme, `useSite()`, [VueUse](https://vueuse.org/) |
| `@mysite/client` | Nuxt layer: [Pinia](https://pinia.vuejs.org/) + [Pinia Colada](https://pinia-colada.esm.dev/), Better Auth Vue client (`useAuth()`, `useAuthClient()`) |
| `@mysite/types` | Shared Zod schemas + inferred types (login) |
| `@mysite/config` | Ports, API base helper |

Layers are extended by package name: `web` extends `@mysite/ui`; `app`/`admin` extend
`@mysite/ui` + `@mysite/client`. `apps/api` uses no layer — its Better Auth setup lives in
`apps/api/server/database/auth.ts` and `apps/api/server/utils/auth.ts`.

Rendering modes:

| App | Mode |
| --- | --- |
| Web | Prerendered at build (`nuxt build`, `routeRules` + `nitro.prerender`) |
| App | SPA (`ssr: false`) |
| Admin | SPA (`ssr: false`), protected by Better Auth (`role === 'admin'`) |
| API | Server (Nitro routes) |

## Setup

```bash
pnpm install
```

Copy the env examples for the apps you run:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

## Development

Run one app:

```bash
pnpm dev:web
pnpm dev:app
pnpm dev:admin
pnpm dev:api
```

Run all apps in parallel with [Turborepo](https://turborepo.com) (`turbo.json`):

```bash
pnpm dev
```

`turbo run dev` supervises the four dev servers and stops them on Ctrl+C. If a
dev server ever survives a forced stop (Nuxt can be reparented), reap whatever
is still bound to the app ports:

```bash
pnpm dev:stop
```

Ports: web `3000`, app `3001`, admin `3002`, api `3003`.

## Tasks

Turborepo (`turbo.json`) runs each app's scripts. `pnpm install` runs the
`nuxt:prepare` task via `postinstall`.

```bash
pnpm build       # turbo run build
pnpm type-check  # turbo run type-check (vue-tsc per app)
pnpm lint        # eslint across the repo
pnpm clean       # turbo run clean (nuxt cleanup)
```

## Database

Postgres 18 and Redis 8 run in Docker (`docker-compose.yml`), exposed on host
ports `55432` and `6381` to match `DATABASE_URL` / `REDIS_URL` in
`apps/api/.env.example`. Redis is used only by the Better Auth rate limiter —
sessions live in Postgres.

```bash
pnpm db:up     # start postgres + redis
pnpm db:logs   # tail logs (postgres)
pnpm db:down   # stop and remove containers
```

- Postgres: `postgres://nuxt_app_user:nuxt_app_password@localhost:55432/nuxt_app_db`
- Redis: `redis://localhost:6381`

Drizzle Studio runs in its own container (host port `4984`):

```bash
pnpm db:studio   # build + start drizzle-studio
```

Open <https://local.drizzle.studio?port=4984> to browse the database. (The
container logs a `?host=0.0.0.0` URL — ignore it; the browser must target the
host-mapped port via `?port=4984`.)

The API uses [Drizzle ORM](https://orm.drizzle.team) with
[Better Auth](https://better-auth.com) tables (`user`, `session`, `account`,
`verification`). Schema lives in `apps/api/server/database/schema.ts` (re-exported
from the generated `auth-schema.ts`); server helpers are auto-imported via `useDb()`.

```bash
pnpm --filter @mysite/api db:generate       # generate SQL migrations
pnpm --filter @mysite/api db:migrate        # apply migrations
pnpm --filter @mysite/api db:seed           # upsert the dev admin user
pnpm --filter @mysite/api db:push           # push schema without migrations (prototyping)
pnpm --filter @mysite/api db:studio         # run Drizzle Studio locally (no Docker)
pnpm --filter @mysite/api db:auth:generate  # regenerate the Better Auth Drizzle schema
```

The seed signs up `dev@mysite.com` / `password123` (override with `SEED_EMAIL` /
`SEED_PASSWORD`) through Better Auth and grants it the `admin` role.

`GET /api/health/ready` pings Postgres and Redis.

### Local subdomains (optional)

Add to `/etc/hosts`:

```
127.0.0.1 web.local.mysite.com app.local.mysite.com admin.local.mysite.com api.local.mysite.com
```

## Lint

ESLint with [`@antfu/eslint-config`](https://github.com/antfu/eslint-config) is configured at the
workspace root and covers every app and package.

```bash
pnpm lint
pnpm lint:fix
```

For auto-fix on save, install the VS Code ESLint extension and add the
recommended settings from the config's README.

## Build

```bash
pnpm build
```

## Deployment

All four apps deploy to Vercel as **separate projects** (one per subdomain).
Each app ships a `vercel.json`; Nitro auto-selects the `vercel` preset when
`VERCEL=1`.

For every project:

1. Create a Vercel project and set **Root Directory** to `apps/<name>`.
2. Enable **Include source files outside of the Root Directory in the Build
   Step** (needed for the `packages/*` workspace layers).
3. Framework preset: **Nuxt**. Regions default to `iad1` in `vercel.json` — set
   them to match your database region.

### Environment variables

Frontends (`web`, `app`, `admin`) — Production + Preview:

```
NUXT_PUBLIC_API_BASE=https://api.mysite.com
NUXT_PUBLIC_WEB_URL=https://web.mysite.com
NUXT_PUBLIC_APP_URL=https://app.mysite.com
NUXT_PUBLIC_ADMIN_URL=https://admin.mysite.com
```

Admin additionally needs none — it signs in through the same Better Auth API and
gates on the `admin` role.

API (`apps/api`) — Production + Preview:

```
DATABASE_URL=postgresql://...@ep-xxx-pooler.<region>.aws.neon.tech/neondb?sslmode=require
DATABASE_DRIVER=neon
BETTER_AUTH_URL=https://api.mysite.com
BETTER_AUTH_SECRET=            # openssl rand -base64 32
REDIS_URL=rediss://default:password@host:port
CORS_ORIGINS=https://web.mysite.com,https://app.mysite.com,https://admin.mysite.com
```

### Managed services

- **Postgres: Neon.** Use the **pooled** connection string. `useDb()` detects a
  `*.neon.tech` host (or `DATABASE_DRIVER=neon`) and uses
  `drizzle-orm/neon-http` — no TCP pool, serverless-friendly. Note the HTTP
  driver does not support `db.transaction()`, and Better Auth creates the user +
  credential account in a transaction on sign-up; use a TCP/`pg` service (or the
  pooled websocket driver) if you rely on sign-up in production.
- **Redis: rate limiting only.** `useRedis()` (ioredis) backs the Better Auth
  rate limiter through a custom `consume` implementation in
  `apps/api/server/utils/rate-limit.ts` (atomic `INCR` + `PEXPIRE` via Lua) —
  sessions are **not** stored in Redis. Point `REDIS_URL` at any TCP Redis;
  managed providers expose a TLS URL (`rediss://...`).

Local dev is unchanged: `useDb()` uses `pg` and `useRedis()` uses `ioredis`,
both pointed at the Docker containers from `docker-compose.yml`. The DB seam
returns a stable `NodePgDatabase` type, so app code never branches on the driver.

### Migrations

`drizzle-kit` connects over TCP, so run migrations from your machine or CI
against the Neon pooled URL (not from the Vercel build):

```bash
pnpm --filter @mysite/api db:generate
pnpm --filter @mysite/api db:migrate
```

### Auth and DNS

[Better Auth](https://better-auth.com) handles email + password authentication.
Its handler is mounted at `/api/auth/[...all]` on the API
(`apps/api/server/api/auth/[...all].ts`) with the Drizzle adapter; sessions live
in Postgres (`session` table) and travel in Better Auth's HttpOnly cookie.
Config is in `apps/api/server/database/auth.ts` (shared with the CLI and seed),
and server guards (`getCurrentUser`, `requireUser`) are in
`apps/api/server/utils/session.ts`.

Rate limiting is enabled (60s window / 100 requests, with Better Auth's stricter
built-in rules for sensitive paths such as `/sign-in/email`) and its counters are
stored in Redis via the custom `consume` storage — no rate-limit table, and no
sessions in Redis.

The `@mysite/client` layer wraps the Better Auth Vue client: `app` uses
`useAuth()` for sign-in/out and session state; `admin` adds a global route
middleware requiring `user.role === 'admin'`.

`web.mysite.com` → `api.mysite.com` is same-site, so `SameSite=Lax` cookies are
sent. `CORS_ORIGINS` lists the frontend origins for CORS *and* feeds Better
Auth's `trustedOrigins` (the API sends `Access-Control-Allow-Credentials: true`).
Set `BETTER_AUTH_URL` to the API's public origin. Add each subdomain in your
Vercel project's Domains settings and point DNS (`A`/`CNAME`).
