# Database operations

Run commands from the repository root. For initial environment setup, follow
[Setup](../README.md#setup).

Postgres 18 and Redis 8 run in Docker (`docker-compose.yml`), exposed on host
ports `55432` and `6381` to match `DATABASE_URL` / `REDIS_URL` in
`apps/api/.env.example`. Redis backs Better Auth and versioned-route rate limiting;
sessions live in Postgres.

```bash
pnpm db:up     # start postgres + redis + drizzle-studio (waits until healthy)
pnpm db:logs   # tail logs (postgres)
pnpm db:down   # stop and remove containers (volumes kept)
pnpm db:reset  # deletes Postgres and Redis volumes, then rebuilds containers
```

Use `db:reset` only for disposable data. After a reset, rerun migrations and
`pnpm db:test:create` before database-backed tests. Use `db:down` to preserve data.

- Postgres: `postgres://nuxt_app_user:nuxt_app_password@localhost:55432/nuxt_app_db`
- Test Postgres: `postgres://nuxt_app_user:nuxt_app_password@localhost:55432/nuxt_app_test`
- Redis: `redis://localhost:6381`

Drizzle Studio runs on host port `4984`; `db:up` starts it with the other
containers. Rebuild its image after dependency changes:

```bash
pnpm db:studio:docker   # rebuild + start drizzle-studio
```

Open <https://local.drizzle.studio?port=4984> to browse the database. The
container logs a `?host=0.0.0.0` URL, but the browser needs the host-mapped
port in `?port=4984`.

The API uses [Drizzle ORM](https://orm.drizzle.team) with
[Better Auth](https://better-auth.com) tables (`user`, `session`, `account`,
`verification`). `apps/api/server/database/schema.ts` re-exports the generated
`auth-schema.ts`; server helpers such as `useDb()` are
imported explicitly from `server/utils/`.

```bash
pnpm db:generate       # generate SQL migrations
pnpm db:migrate        # apply migrations
pnpm db:seed           # delete and recreate the configured dev admin user
pnpm db:push           # push schema without migrations (disposable prototyping)
pnpm db:studio         # run Drizzle Studio locally (no Docker)
pnpm db:auth:generate  # regenerate the Better Auth Drizzle schema
```

Root database scripts forward to `@nuxt-app/api`. Run them from the repository
root or use `pnpm --filter @nuxt-app/api <script>`.

The Drizzle commands require `DATABASE_URL` in `apps/api/.env` or the process
environment, including during migration generation. After changing Better Auth
configuration, run `pnpm db:auth:generate`, then `pnpm db:generate`. Review the
generated schema and SQL before applying migrations.

The auth generator and runtime use separate version declarations in
[`apps/api/package.json`](../apps/api/package.json). Compare both before an auth
upgrade and review the regenerated schema for compatibility.

## Seeding

The seed signs up `dev@nuxt-app.com` / `password123` (override with `SEED_EMAIL` /
`SEED_PASSWORD`) through Better Auth and grants it the `admin` role.
If that email already exists, the seed deletes its user, accounts, and sessions
before recreating it. Run it only against a disposable development account.

## Test database

`nuxt_app_test` is a second database in the same Postgres container. The `api`
and `api-dev` Vitest projects run against it through `TEST_DATABASE_URL`, and
every `db:test:*` command refuses a URL whose database name does not end in
`_test`. This keeps them separate from `nuxt_app_db`. `pnpm db:up`
creates the database when it is missing; the init script under
`docker/postgres/init/` covers fresh volumes.

```bash
pnpm db:test:create   # create nuxt_app_test if missing
pnpm db:test:migrate  # apply migrations to the test database
pnpm db:test:push     # push schema without migrations (disposable prototyping)
pnpm db:test:seed     # seed the test database
pnpm db:test:reset    # drop and recreate the configured test database
```

`db:test:migrate`, `db:test:push`, and `db:test:seed` create the database first
when needed. The scripts read `TEST_DATABASE_URL` from `apps/api/.env` or the
process environment and fall back to
`postgres://nuxt_app_user:nuxt_app_password@localhost:55432/nuxt_app_test`.

`GET /api/health/ready` pings Postgres and Redis.

## Local subdomains

Add to `/etc/hosts`:

```
127.0.0.1 web.local.nuxt-app.com app.local.nuxt-app.com admin.local.nuxt-app.com api.local.nuxt-app.com
```

Use these hostnames with the same app ports. Update the frontend URLs,
`NUXT_PUBLIC_API_BASE`, `BETTER_AUTH_URL`, and `CORS_ORIGINS` to match.

## Managed services

- **Postgres on Neon.** Use the pooled connection string. `useDb()` selects
  `drizzle-orm/neon-http` when `DATABASE_DRIVER` is `neon` or, if unset, when
  the URL hostname is `*.neon.tech`. An explicit `DATABASE_DRIVER=pg` keeps the
  TCP driver even on a Neon host. neon-http has no TCP pool and is
  suited to serverless requests. `withTransaction()` throws on this driver.
  Select `DATABASE_DRIVER=pg` for operations that need interactive transactions.
  The repository supports `pg` and `neon` drivers; no WebSocket driver is wired.
- **Redis for rate limiting.** `useRedis()` (ioredis) backs the Better Auth
  rate limiter through a custom `consume` implementation in
  `apps/api/server/utils/rate-limit.ts` (atomic `INCR` + `PEXPIRE` via Lua).
  Postgres stores sessions. Point `REDIS_URL` at any TCP Redis;
  managed providers expose a TLS URL (`rediss://...`).

The database helper returns a `Database` type without `.transaction()`. Use
`withTransaction(fn)` for atomic writes and verify rollback with the deployment
driver.
Better Auth receives the raw Drizzle handle, but the current auth configuration
does not enable the adapter's optional transaction mode. Verify auth persistence
against the deployment driver when changing that configuration. See
[ADR 0002](adr/0002-database-capability-seam.md).

## Migrations

`drizzle-kit` connects over TCP, so run migrations from your machine or CI
against the Neon pooled URL (not from the Vercel build):

```bash
pnpm db:generate
pnpm db:migrate
```
