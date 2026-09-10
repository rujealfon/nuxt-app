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
| `@mysite/ui` | Nuxt layer: components + `useSite()` + [VueUse](https://vueuse.org/) + [Pinia](https://pinia.vuejs.org/) / [Pinia Colada](https://pinia-colada.esm.dev/) |
| `@mysite/auth` | Nuxt layer: `useAuth()` + server session utils |
| `@mysite/types` | Shared TypeScript types |
| `@mysite/config` | Ports, domain, cookie name, API base helper |

`@mysite/ui` and `@mysite/auth` are [Nuxt layers](https://nuxt.com/docs/4.x/getting-started/layers)
extended by package name: the frontends (`web`, `app`, `admin`) extend both, while `apps/api` extends
only `@mysite/auth` (server-only, no client code).

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

Run all apps in parallel:

```bash
pnpm dev
```

Ports: web `3000`, app `3001`, admin `3002`, api `3003`.

## Database

Postgres 18 and Redis run in Docker (`docker-compose.yml`), exposed on host
ports `55432` and `6381` to match `DATABASE_URL` / `REDIS_URL` in
`apps/api/.env.example`.

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

Open https://local.drizzle.studio?host=localhost:4984 to browse the database.

The API uses [Drizzle ORM](https://orm.drizzle.team). Schema lives in
`apps/api/server/database/schema.ts`; server helpers are auto-imported via
`useDb()` and `useRedis()`.

```bash
pnpm --filter @mysite/api db:generate  # generate SQL migrations
pnpm --filter @mysite/api db:migrate   # apply migrations
pnpm --filter @mysite/api db:push      # push schema without migrations
pnpm --filter @mysite/api db:studio    # run Drizzle Studio locally (no Docker)
```

`GET /api/health/ready` pings both Postgres and Redis.

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
NUXT_PUBLIC_SITE_DOMAIN=mysite.com
```

Admin additionally needs `NUXT_ADMIN_USER` / `NUXT_ADMIN_PASSWORD`.

API (`apps/api`) — Production + Preview:

```
DATABASE_URL=postgresql://...@ep-xxx-pooler.<region>.aws.neon.tech/neondb?sslmode=require
DATABASE_DRIVER=neon
REDIS_URL=rediss://default:password@host:port
CORS_ORIGINS=https://web.mysite.com,https://app.mysite.com,https://admin.mysite.com
```

### Managed services

- **Postgres: Neon.** Use the **pooled** connection string. `useDb()` detects a
  `*.neon.tech` host (or `DATABASE_DRIVER=neon`) and uses
  `drizzle-orm/neon-http` — no TCP pool, serverless-friendly. Note the HTTP
  driver does not support `db.transaction()`; use a batch or the pooled
  websocket driver if you need transactions.
- **Redis: TCP only.** `useRedis()` uses `ioredis` on `REDIS_URL`. Point it at
  any TCP Redis — a managed provider's TLS URL (`rediss://...`) on Vercel, or
  the Docker container locally. No REST/HTTP client is involved.

Local dev is unchanged: `useDb()` uses `pg` and `useRedis()` uses `ioredis`,
pointed at the Docker containers from `docker-compose.yml`. The DB seam returns
a stable `NodePgDatabase` type, so app code never branches on the driver.

### Migrations

`drizzle-kit` connects over TCP, so run migrations from your machine or CI
against the Neon pooled URL (not from the Vercel build):

```bash
pnpm --filter @mysite/api db:generate
pnpm --filter @mysite/api db:migrate
```

### Auth and DNS

Cross-subdomain auth uses the `mysite_session` cookie (see `@mysite/config`);
`web.mysite.com` → `api.mysite.com` is same-site, so `SameSite=Lax` cookies are
sent. `CORS_ORIGINS` on the API must list the frontend origins and the API sets
`Access-Control-Allow-Credentials: true`. Add each subdomain to its Vercel
project's Domains settings and point DNS (`A`/`CNAME`).
