# nuxt-app

pnpm monorepo with four independently deployable Nuxt apps sharing common packages.

| App | Subdomain | Local port | Source |
| --- | --- | --- | --- |
| Web | `web.nuxt-app.com` | 3000 | `apps/web` |
| App | `app.nuxt-app.com` | 3001 | `apps/app` |
| Admin | `admin.nuxt-app.com` | 3002 | `apps/admin` |
| API | `api.nuxt-app.com` | 3003 | `apps/api` |

Shared packages:

| Package | Purpose |
| --- | --- |
| `@nuxt-app/ui` | Nuxt layer: [Nuxt UI](https://ui.nuxt.com/) components, theme, `useSite()`, [VueUse](https://vueuse.org/) |
| `@nuxt-app/client` | Nuxt layer: [Pinia](https://pinia.vuejs.org/) + [Pinia Colada](https://pinia-colada.esm.dev/), Better Auth Vue client (`useAuth()`: actor + session actions) |
| `@nuxt-app/types` | Shared Zod schemas + inferred types for authentication and versioned API contracts |
| `@nuxt-app/config` | Ports, API base helper, API version registry |
| `@nuxt-app/logger` | Shared Pino logger factory |

Layers are extended by package name: `web` extends `@nuxt-app/ui`; `app`/`admin` extend
`@nuxt-app/ui` + `@nuxt-app/client`. `apps/api` uses no layer; its Better Auth setup lives in
`apps/api/server/database/auth.ts` and `apps/api/server/utils/auth.ts`.

Rendering modes:

| App | Mode |
| --- | --- |
| Web | Prerendered at build (`nuxt build`, `routeRules` + `nitro.prerender`) |
| App | SPA (`ssr: false`) |
| Admin | SPA (`ssr: false`), protected by Better Auth (`role === 'admin'`) |
| API | Server (Nitro routes) |

## Contributor guides

Read [AGENTS.md](AGENTS.md) for repository-wide coding, testing, and PR
conventions. When changing an app, also read its guide:

- [Web](apps/web/AGENTS.md): public pages, prerendering, and navigation.
- [App](apps/app/AGENTS.md): user authentication flows and API clients.
- [Admin](apps/admin/AGENTS.md): role-based routing and admin interface tests.
- [API](apps/api/AGENTS.md): versioned routes, services, and database changes.

The root guide applies throughout the repository; app guides add guidance for
their directories. Keep contributor rules in these guides and setup, operation,
and deployment instructions in this README. Update the relevant documentation
when changing those workflows.

## Architecture

Substantial frontend behavior lives in app-local `app/features/<feature>/`
modules. Route files compose their public exports; shared Nuxt UI and client
foundations remain in `packages/`. API handlers call explicitly imported
`server/services/<domain>/` entrypoints. See [the architecture guide](docs/architecture.md)
for dependency rules, current examples, and when to extract shared code.

For use cases, authorization policies, API errors, transactions, and background
work, see [Backend Patterns and Growth Plan](docs/backend-patterns.md). It records
what to introduce as features grow and how to verify each pattern.

## Setup

Use Node.js 22 (matching CI) and the pnpm version pinned in `package.json`.
Run the commands below from the repository root.

```bash
pnpm install
```

Copy the env examples for the apps you run:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/app/.env.example apps/app/.env
cp apps/admin/.env.example apps/admin/.env
```

The frontend examples use production URLs. For local development, set the
`NUXT_PUBLIC_*_URL` values to the corresponding `http://localhost:3000` to
`3002` origins and `NUXT_PUBLIC_API_BASE` in app/admin to `http://localhost:3003`.

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
pnpm vite-doctor # turbo run vite-doctor (Vite Doctor framework diagnostics)
pnpm clean       # turbo run clean (nuxt cleanup)
```

Each app and shared Nuxt layer registers the `vite-doctor/nuxt` module, so
`nuxt doctor` runs Vite, Vue, Nuxt, and Nitro diagnostics against that project's
source. Doctor is pre-1.0: its CI job is advisory (`continue-on-error`) and its
findings do not block a pull request yet. Configure per-project rules through
the `doctor` key in each `nuxt.config.ts`; see the
[Nuxt guide](https://vite-doctor.onmax.me/nuxt).

## Database

Postgres 18 and Redis 8 run in Docker (`docker-compose.yml`), exposed on host
ports `55432` and `6381` to match `DATABASE_URL` / `REDIS_URL` in
`apps/api/.env.example`. Redis backs Better Auth and versioned-route rate limiting;
sessions live in Postgres.

```bash
pnpm db:up     # start postgres + redis + drizzle-studio (waits until healthy)
pnpm db:logs   # tail logs (postgres)
pnpm db:down   # stop and remove containers (volumes kept)
pnpm db:reset  # DESTRUCTIVE: down -v (wipes data) then rebuild + up
```

- Postgres: `postgres://nuxt_app_user:nuxt_app_password@localhost:55432/nuxt_app_db`
- Redis: `redis://localhost:6381`

Drizzle Studio is part of the same compose project (host port `4984`), so
`db:up` starts it too. Use `db:studio:docker` to rebuild its image after
dependency changes:

```bash
pnpm db:studio:docker   # rebuild + start drizzle-studio
```

Open <https://local.drizzle.studio?port=4984> to browse the database. (The
container logs a `?host=0.0.0.0` URL. Ignore it; the browser must target the
host-mapped port via `?port=4984`.)

The API uses [Drizzle ORM](https://orm.drizzle.team) with
[Better Auth](https://better-auth.com) tables (`user`, `session`, `account`,
`verification`). Schema lives in `apps/api/server/database/schema.ts` (re-exported
from the generated `auth-schema.ts`); server helpers such as `useDb()` are
imported explicitly from `server/utils/`.

```bash
pnpm db:generate       # generate SQL migrations
pnpm db:migrate        # apply migrations
pnpm db:seed           # upsert the dev admin user
pnpm db:push           # push schema without migrations (prototyping)
pnpm db:studio         # run Drizzle Studio locally (no Docker)
pnpm db:auth:generate  # regenerate the Better Auth Drizzle schema
```

Each forwards to `pnpm --filter @nuxt-app/api <script>`, so the same commands
work from the API package directly.

The seed signs up `dev@nuxt-app.com` / `password123` (override with `SEED_EMAIL` /
`SEED_PASSWORD`) through Better Auth and grants it the `admin` role.

`GET /api/health/ready` pings Postgres and Redis.

### Local subdomains (optional)

Add to `/etc/hosts`:

```
127.0.0.1 web.local.nuxt-app.com app.local.nuxt-app.com admin.local.nuxt-app.com api.local.nuxt-app.com
```

## Lint

ESLint with [`@antfu/eslint-config`](https://github.com/antfu/eslint-config) is configured at the
workspace root and covers every app and package.

```bash
pnpm lint
pnpm lint:fix
```

`ts/no-deprecated` rejects APIs marked `@deprecated` in app TypeScript source and
tests, root tests, `packages/{config,types,logger}`, and the Nuxt layer packages
`client` and `ui`. This runs in CI and the pre-commit lint hook; TypeScript's type
checker alone does not reject deprecated APIs. It requires the generated Nuxt
types from `pnpm install`: every app and layer has a committed `tsconfig.json`
over its `nuxt prepare` output. Vue files and configuration files are not yet
covered by this type-aware rule.

Type-aware linting loads a generated Nuxt TypeScript project per app and layer;
every project binds ~2,000 declaration files and costs roughly 0.5 GB of heap, so
linting the whole repository in one process peaks near 3.7 GB, above Node's
default ~2 GB on CI. `pnpm lint` and `pnpm lint:fix` therefore run ESLint once per
workspace through `scripts/lint.mjs`, keeping each process to a single project.
The lint-staged hook still lints arbitrary staged files in one process, so it
keeps a `--max-old-space-size=6144` cap. Add new lint entrypoints through the
runner rather than a bare `eslint`.

For auto-fix on save, install the VS Code ESLint extension and add the
recommended settings from the config's README.

## Testing

Hermetic [Vitest](https://vitest.dev) + [`@nuxt/test-utils`](https://nuxt.com/docs/4.x/getting-started/testing),
run from a single root config (`vitest.config.ts`) using projects, with no Docker or
external services required.

```bash
pnpm test                 # run everything once
pnpm test:watch           # watch mode
pnpm test --project api   # one project (unit | api | ui | client | web | app | admin)
```

- `unit` (node env): architecture checks in `test/`, pure logic in
  `packages/{config,types,logger}`, and colocated tests under `apps/api/server/`.
- `api` (e2e): boots the real Nitro server for `apps/api` and asserts the
  versioning contract: discovery, `X-Api-Version`, and JSON 404s. The rate
  limiter is disabled with `RATE_LIMIT_ENABLED=false`.
- `ui`, `client`, `web`, `app`, `admin` (Nuxt env): composables, components,
  route middleware, and pages via `mockNuxtImport` / `mountSuspended`.

Name tests `*.spec.ts`. Frontend and Nuxt-layer tests may live under `app/`
beside source files or in `test/`; shared config/types/logger tests live in
their package's `test/` directory. Colocate API unit tests under `server/`
and put API integration tests in `apps/api/test/e2e/`. See
[`vitest.config.ts`](vitest.config.ts) for the discovery patterns.

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs install, lint,
type-check, and test on pushes to `main` and on pull requests. A separate
`coverage` job runs `pnpm test:coverage:ci`; Vitest enforces the thresholds in
[`vitest.config.ts`](vitest.config.ts) (90% lines/functions/branches/statements)
and fails the job if they drop. Coverage is not uploaded anywhere — the
thresholds are the gate. An advisory `vite-doctor` job runs `pnpm vite-doctor`;
it reports framework diagnostics without failing the run until its findings are
triaged.

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
3. Framework preset: **Nuxt**. Regions default to `iad1` in `vercel.json`; set
   them to match your database region.

### Environment variables

Frontends (`web`, `app`, `admin`), Production + Preview:

```
NUXT_PUBLIC_API_BASE=https://api.nuxt-app.com
NUXT_PUBLIC_API_VERSION=v1          # optional; defaults to the current version
NUXT_PUBLIC_WEB_URL=https://web.nuxt-app.com
NUXT_PUBLIC_APP_URL=https://app.nuxt-app.com
NUXT_PUBLIC_ADMIN_URL=https://admin.nuxt-app.com
```

Admin needs no extra variables. It signs in through the same Better Auth API and
gates on the `admin` role.

API (`apps/api`), Production + Preview:

```
DATABASE_URL=postgresql://...@ep-xxx-pooler.<region>.aws.neon.tech/neondb?sslmode=require
DATABASE_DRIVER=neon
BETTER_AUTH_URL=https://api.nuxt-app.com
BETTER_AUTH_SECRET=            # openssl rand -base64 32
REDIS_URL=rediss://default:password@host:port
CORS_ORIGINS=https://web.nuxt-app.com,https://app.nuxt-app.com,https://admin.nuxt-app.com
```

### Managed services

- **Postgres: Neon.** Use the **pooled** connection string. `useDb()` selects
  `drizzle-orm/neon-http` when `DATABASE_DRIVER` is `neon` or, if unset, when
  the URL hostname is `*.neon.tech`. An explicit `DATABASE_DRIVER=pg` keeps the
  TCP driver even on a Neon host. neon-http has no TCP pool and is
  serverless-friendly. App code cannot call `.transaction()` directly;
  `withTransaction()` throws on this driver. Better Auth still receives the raw
  drizzle handle and creates the user + credential
  account in a transaction on sign-up. Use a TCP/`pg` service (or the pooled
  websocket driver) if you rely on sign-up in production.
- **Redis: rate limiting only.** `useRedis()` (ioredis) backs the Better Auth
  rate limiter through a custom `consume` implementation in
  `apps/api/server/utils/rate-limit.ts` (atomic `INCR` + `PEXPIRE` via Lua).
  Sessions are **not** stored in Redis. Point `REDIS_URL` at any TCP Redis;
  managed providers expose a TLS URL (`rediss://...`).

Local dev is unchanged: `useDb()` uses `pg` and `useRedis()` uses `ioredis`,
both pointed at the Docker containers from `docker-compose.yml`. The DB seam
returns a `Database` type without `.transaction()`; use `withTransaction(fn)`
for atomic writes; it throws when the configured driver cannot transact.
Better Auth's adapter still calls `.transaction()` on the raw drizzle object.

### Migrations

`drizzle-kit` connects over TCP, so run migrations from your machine or CI
against the Neon pooled URL (not from the Vercel build):

```bash
pnpm db:generate
pnpm db:migrate
```

### Auth and DNS

[Better Auth](https://better-auth.com) handles email + password authentication.
Its handler is mounted at `/api/auth/[...all]` on the API
(`apps/api/server/api/auth/[...all].ts`) with the Drizzle adapter; sessions live
in Postgres (`session` table). The browser apps carry the session token in an
HttpOnly cookie; a native shell switches to a bearer token instead (see
[Native (Capacitor) app](#native-capacitor-app)).
Config is in `apps/api/server/database/auth.ts` (shared with the CLI and seed),
and server guards (`getActor`, `requireActor`) are in
`apps/api/server/utils/session.ts`.

Rate limiting is enabled (60s window / 100 requests, with Better Auth's stricter
built-in rules for sensitive paths such as `/sign-in/email`) and its counters are
stored in Redis via the custom `consume` storage, so there is no rate-limit table
and no sessions in Redis. The API's own routes get the same Redis-backed limiter
(`apps/api/server/middleware/rate-limit.ts`). Every `/api/*` path except
`/api/auth/*` and `/api/health*` is limited per IP + route (health checks are
exempt so monitoring isn't throttled).

The `@nuxt-app/client` layer wraps the Better Auth Vue client: `app` uses
`useAuth()` for sign-in/out, sign-up and session state; `admin` adds a global
route middleware requiring `actor.role === 'admin'`. `app` exposes open
registration at `/register` (new users get `role: 'user'`; only the seed user is
an admin).

`web.nuxt-app.com` → `api.nuxt-app.com` is same-site, so `SameSite=Lax` cookies are
sent. `CORS_ORIGINS` lists the frontend origins for CORS *and* feeds Better
Auth's `trustedOrigins` (the API sends `Access-Control-Allow-Credentials: true`).
Set `BETTER_AUTH_URL` to the API's public origin. Add each subdomain in your
Vercel project's Domains settings and point DNS (`A`/`CNAME`).

### API versioning

Versioned routes are path-versioned under `/api/<version>/`. Infra routes are
unversioned: `/api/auth/*` (Better Auth), `/api/health*` (monitoring),
`GET /api` (version registry), and `/api/docs` + `/api/openapi.json` (Scalar
API docs, development-only, self-hosted from the installed `@scalar/api-reference`
bundle). A missing or unknown version (e.g. `/api/hello`, `/api/v9/hello`)
returns a JSON `404`, so clients must be explicit about the version.

The registry lives in `packages/config` (`apiVersions`, `currentApiVersion`,
`deprecatedApiVersions`), the single registry shared by the API and the
frontends. `GET /api` reports what's available:

```json
{ "current": "v1", "versions": [{ "version": "v1", "deprecated": false }] }
```

In `apps/api`, version folders are thin versioned-route handlers that call the
version-agnostic domain logic in `server/services/<domain>/`. Import each
domain explicitly through its `index.ts` entrypoint; import server utilities
from `server/utils/` explicitly. Wrap routes with `defineVersionedHandler('v1', ...)`. It sets
`X-Api-Version` on every response and adds `Deprecation` + `Sunset` headers once
the version appears in `deprecatedApiVersions`.

To ship a new version:

1. Add `server/api/v2/**` handlers, reusing `server/services/` where behaviour is
   unchanged.
2. Append `'v2'` to `apiVersions` and set `currentApiVersion = 'v2'`.
3. Mark the old one: `deprecatedApiVersions = { v1: { sunset: '2026-12-31' } }`.
4. After the sunset date, delete `server/api/v1/**` and drop the registry entry.

Frontends target a version with `NUXT_PUBLIC_API_VERSION` (defaults to
`currentApiVersion`). `useApi()` from `@nuxt-app/client` returns a `$fetch`
instance scoped to `<apiBase>/api/<version>` (carrying the session per the
configured [session transport](#native-capacitor-app)). `useApiFetch()` provides
the SSR-aware Nuxt fetch path with the same authenticated client. Better Auth
keeps its own unversioned client internal to `useAuth()`.

## Native (Capacitor) app

A native shell hosts the SPA in a WebView, served from `capacitor://localhost`
(iOS) or `https://localhost` (Android). Every API call is therefore cross-origin,
and WebViews refuse the API's cross-origin `Set-Cookie`: the sign-in request
succeeds, the cookie is dropped, and the user is signed out again on the next
navigation. The shell uses the bearer transport instead ([ADR-0003](docs/adr/0003-bearer-tokens-for-native-clients.md)).

1. Set `AUTH_BEARER_ENABLED=true` on the API deployment. Only then does Better
   Auth register its bearer plugin and the CORS middleware expose
   `set-auth-token`. This is opt-in because the plugin also hands the session
   token to JavaScript on cookie sign-ins, which undoes HttpOnly; a deployment
   that serves browser apps should leave it off unless it also serves a native
   client.
2. Set `NUXT_PUBLIC_SESSION_TRANSPORT=bearer` in the app's environment.
   `useAuth()` and `useApi()` then send the session token in an `Authorization`
   header and stop using cookies. Unset — or any other value — keeps cookies,
   per `sessionTransportFor()`.
3. Add the WebView origin to `CORS_ORIGINS` on the API. The origin is
   `server.iosScheme` / `server.androidScheme` + `server.hostname`, i.e.
   `capacitor://localhost` on iOS and `https://localhost` on Android by default;
   log `window.location.origin` from the device to confirm rather than trusting
   that. The same list feeds Better Auth's `trustedOrigins`, so a missing origin
   fails sign-in with a `403` rather than a CORS error.
4. Optionally replace token storage. The default is `localStorage`; call
   `useAuthTokenStore()` once at startup with a store backed by
   `@capacitor/preferences` (or a Keychain/Keystore plugin), which can persist
   across a WebView data eviction. It accepts any `{ read, write, clear }` whose
   members return promises.

   A failed token write or clear rejects the authentication action and prevents
   further token reads in that app session until storage recovers through a
   successful write or clear. Failed writes also attempt to remove the previous
   token. If cleanup fails, retry sign-out before closing the app: the underlying
   storage may still contain the old token after a restart.

No API route changes are needed: `requireActor` resolves the actor from the same
`Authorization` header.

Social sign-in does not work through `signIn.social()` in a WebView. Complete it
with the provider's native SDK and forward the ID token, or register a
custom-scheme callback. Email + password is covered as-is.
