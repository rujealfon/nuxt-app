# nuxt-app

This pnpm monorepo has four Nuxt apps that deploy separately and share workspace packages.

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
| `@nuxt-app/client` | Nuxt layer: [Pinia](https://pinia.vuejs.org/), [Pinia Colada](https://pinia-colada.esm.dev/), auth state and forms, authenticated API clients |
| `@nuxt-app/types` | Shared Zod schemas + inferred types for authentication and versioned API contracts |
| `@nuxt-app/config` | Ports, site URLs, API version and operation registries, session transport settings |
| `@nuxt-app/logger` | Shared Pino logger factory |

Layers are extended by package name: `web` extends `@nuxt-app/ui`; `app`/`admin` extend
`@nuxt-app/ui` + `@nuxt-app/client`. `apps/api` uses no layer; its Better Auth setup lives in
`apps/api/server/database/auth.ts` and `apps/api/server/utils/auth.ts`.
Import layer composables explicitly from `#imports`; `@nuxt-app/client` does
not export ordinary composable subpaths.

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

The root guide applies throughout the repository. App guides cover their own
directories. This README covers setup, operation, and deployment.

## Architecture

Substantial frontend behavior lives in app-local `app/features/<feature>/`
modules. Route files compose their public exports; shared Nuxt UI and client
foundations remain in `packages/`. API handlers call explicitly imported
`server/services/<domain>/` entrypoints. See [the architecture guide](docs/architecture.md)
for dependency rules, current examples, and when to extract shared code.

For business operations, authorization policies, API errors, transactions, and
background work, see [backend patterns](docs/backend-patterns.md). That guide
marks which patterns exist now and when to add the others.

## Setup

Use Node.js 22.23.2 or newer within the 22.x line, matching CI, and pnpm 12.4.2,
as pinned in `package.json`.
Run the commands below from the repository root.

```bash
pnpm install
```

Copy the env examples for the apps you run, keeping any existing `.env` files:

```bash
test -f apps/api/.env || cp apps/api/.env.example apps/api/.env
test -f apps/web/.env || cp apps/web/.env.example apps/web/.env
test -f apps/app/.env || cp apps/app/.env.example apps/app/.env
test -f apps/admin/.env || cp apps/admin/.env.example apps/admin/.env
```

The frontend examples use production URLs. For local development, set the
`NUXT_PUBLIC_*_URL` values to the matching origins on `localhost` ports 3000,
3001, and 3002. Set `NUXT_PUBLIC_API_BASE` in app and admin to
`http://localhost:3003`.

In `apps/api/.env`, set `BETTER_AUTH_URL=http://localhost:3003` and
`CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002`.
Generate a secret with `openssl rand -base64 32` and use it as
`BETTER_AUTH_SECRET`. API startup requires at least 32 characters, a valid auth
URL, and non-empty `DATABASE_URL` and `REDIS_URL` values. The API example already
points the database and Redis URLs at the local Docker ports.

For local authentication, start Docker and initialize the database before
starting the API:

```bash
pnpm db:up
pnpm db:migrate
```

Use the optional [seed command](#database) to create a local admin account.

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
server survives a forced stop, run:

```bash
pnpm dev:stop
```

This stops every listener on ports 3000-3003, including processes started
outside this repository. Use it only when those ports can be cleared.

## Tasks

Turborepo (`turbo.json`) runs each app's scripts. `pnpm install` runs the
`nuxt:prepare` task via `postinstall`.

```bash
pnpm build          # turbo run build
pnpm type-check     # Nuxt type checks, then tsc -p tsconfig.test.json
pnpm lint           # ESLint across the repo, then Steiger for frontend features
pnpm lint:structure # Steiger feature structure checks
pnpm vite-doctor    # framework diagnostics across workspaces
pnpm clean          # turbo run clean (nuxt cleanup)
```

Each app and shared Nuxt layer registers the `vite-doctor/nuxt` module. Its CI
job is advisory (`continue-on-error`), so findings do not block a pull request.
Configure per-project rules through
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

Each forwards to `pnpm --filter @nuxt-app/api <script>`, so the same commands
work from the API package directly.

The Drizzle commands require `DATABASE_URL` in `apps/api/.env` or the process
environment, including during migration generation. After changing Better Auth
configuration, run `pnpm db:auth:generate`, then `pnpm db:generate`. Review the
generated schema and SQL before applying migrations. The auth generator is
pinned to 1.7.4 while the runtime dependency is `better-auth ^1.7.5`; check both
when upgrading auth.

The seed signs up `dev@nuxt-app.com` / `password123` (override with `SEED_EMAIL` /
`SEED_PASSWORD`) through Better Auth and grants it the `admin` role.
If that email already exists, the seed deletes its user, accounts, and sessions
before recreating it. Run it only against a disposable development account.

`GET /api/health/ready` pings Postgres and Redis.

### Local subdomains (optional)

Add to `/etc/hosts`:

```
127.0.0.1 web.local.nuxt-app.com app.local.nuxt-app.com admin.local.nuxt-app.com api.local.nuxt-app.com
```

Use these hostnames with the same app ports. Update the frontend URLs,
`NUXT_PUBLIC_API_BASE`, `BETTER_AUTH_URL`, and `CORS_ORIGINS` to match.

## Lint

ESLint with [`@antfu/eslint-config`](https://github.com/antfu/eslint-config) is configured at the
workspace root and covers every app and package. `pnpm lint` also runs
[Steiger](https://github.com/feature-sliced/steiger) for frontend feature
structure after ESLint passes.

```bash
pnpm lint
pnpm lint:fix
pnpm lint:structure
```

`ts/no-deprecated` rejects APIs marked `@deprecated` in app TypeScript source and
tests, root tests, `packages/{config,types,logger}`, and the `client` and `ui`
layers. CI and the pre-commit hook run this rule. It needs the Nuxt types
generated by `pnpm install`. Vue files and configuration files are outside
this type-aware rule.

Type-aware linting loads a Nuxt TypeScript project per app and layer. Linting the
whole repository in one process peaks near 3.7 GB of heap, above Node's CI
default of about 2 GB. `pnpm lint` and `pnpm lint:fix` run ESLint once per
workspace through `scripts/lint.mjs`. After ESLint, `pnpm lint` runs Steiger
against each frontend app. `pnpm lint:structure` runs Steiger alone, and
`pnpm lint:fix` fixes ESLint findings only. The lint-staged hook uses
`--max-old-space-size=6144` when it checks staged files in one process. The runner
discovers directories under `apps/` and `packages/`; add new frontend roots to
the separate `lint:structure` script.

For auto-fix on save, install the VS Code ESLint extension and add the
recommended settings from the config's README.

## Testing

[Vitest](https://vitest.dev) and [`@nuxt/test-utils`](https://nuxt.com/docs/4.x/getting-started/testing)
run through projects in the root `vitest.config.ts`. Tests need no Docker or
external services.

```bash
pnpm test                 # run everything once
pnpm test:watch           # watch mode
pnpm test --project api   # production API HTTP tests
pnpm test --project api-dev # development API docs tests
```

- `unit` (Node environment): architecture checks in `test/`, pure logic in
  `packages/{config,types,logger}`, colocated tests under `apps/api/server/`, and
  the client layer's `*.server.spec.ts` tests.
- `api` (HTTP integration): builds and boots Nitro in production mode to check
  versioning, auth error responses, and JSON 404s for development-only docs.
- `api-dev` (HTTP integration): starts the development server to check Scalar,
  OpenAPI, and the self-hosted docs asset. Both HTTP projects disable the API
  middleware rate limiter with `RATE_LIMIT_ENABLED=false`.
- `ui`, `client`, `web`, `app`, `admin` (Nuxt environment): composables, components,
  route middleware, and pages via `mockNuxtImport` / `mountSuspended`.

Name tests `*.spec.ts`. Frontend and Nuxt-layer tests may live under `app/`
beside source files or in `test/`; shared config/types/logger tests live in
their package's `test/` directory. Colocate API unit tests under `server/`
and put production API integration tests in `apps/api/test/e2e/`, with
development-only HTTP tests in `apps/api/test/e2e-dev/`. See
[`vitest.config.ts`](vitest.config.ts) for the discovery patterns.

CI ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs install, lint,
type-check, and test on pushes to `main` and on pull requests. A separate
`coverage` job runs `pnpm test:coverage:ci`; Vitest enforces the thresholds in
[`vitest.config.ts`](vitest.config.ts) (90% lines/functions/branches/statements)
and fails the job if coverage falls below them. That job runs `unit` and the
Nuxt-environment projects, excluding `api` and `api-dev`. Coverage is not
uploaded. A `commitlint` job validates commit messages and pull request titles
against [Conventional Commits](https://www.conventionalcommits.org/). A
`vite-doctor` job reports framework diagnostics and blocks the run on findings.

## Releases

Releases are automated with
[simple-release-action](https://github.com/TrigenSoftware/simple-release-action).
On every push to `main` it opens or updates a release pull request with the
version bump and `CHANGELOG.md`. Merging that pull request tags the release,
publishes it to GitHub, and runs the release job. Versioning is fixed across all
workspaces and npm publishing is skipped; both are set in
[`.simple-release.json`](.simple-release.json). Commit conventions, the
commitlint config, and the local changelog commands are in
[AGENTS.md](AGENTS.md).

The flow depends on these repository settings:

1. **Pull requests** (Settings → General → Pull Requests). Enable **Allow squash
   merging** and disable **Allow merge commits** and **Allow rebase merging**.
   Set the squash **Default commit message** to **Pull request title**, so the
   release pull request's `chore(release):` title becomes the commit on `main`.
   A merge commit would hide that title and the release would not run.
2. **Actions** (Settings → Actions → General). Enable **Allow GitHub Actions to
   create and approve pull requests**. Without it the release pull request job
   fails.
3. **Branch ruleset** for `main`. Require linear history and require the
   `verify`, `vite-doctor`, `coverage`, and `commitlint` status checks.

The release workflow is
[`.github/workflows/release.yml`](.github/workflows/release.yml).

## Build

```bash
pnpm build
```

Run this after changing exports, Nuxt configuration, or routing; CI does not run
the workspace build. Turbo's `build.env` list is currently missing
`NUXT_PUBLIC_API_VERSION`, `NUXT_PUBLIC_SESSION_TRANSPORT`, `AUTH_BEARER_ENABLED`,
`AUTH_BEARER_ORIGINS`, and `RATE_LIMIT_ENABLED`. Add them before relying on
shell-provided overrides through `pnpm build`, so Turbo passes and hashes them.

## Deployment

All four apps deploy to Vercel as separate projects, one per subdomain.
Each app ships a `vercel.json`; Nitro auto-selects the `vercel` preset when
`VERCEL=1`.

For every project:

1. Create a Vercel project and set **Root Directory** to `apps/<name>`.
2. Enable **Include source files outside of the Root Directory in the Build
   Step** (needed for the `packages/*` workspace layers).
3. Set the framework preset to Nuxt. Only `apps/admin/vercel.json` currently
   pins `iad1`; the other apps leave region selection to Vercel. Configure the
   API's region to match your database deployment.

### Environment variables

All frontends (`web`, `app`, `admin`), Production + Preview:

```
NUXT_PUBLIC_WEB_URL=https://web.nuxt-app.com
NUXT_PUBLIC_APP_URL=https://app.nuxt-app.com
NUXT_PUBLIC_ADMIN_URL=https://admin.nuxt-app.com
```

App and admin also configure the API client:

```dotenv
NUXT_PUBLIC_API_BASE=https://api.nuxt-app.com
NUXT_PUBLIC_API_VERSION=v1          # optional; defaults to the current version
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
  Sessions are **not** stored in Redis. Point `REDIS_URL` at any TCP Redis;
  managed providers expose a TLS URL (`rediss://...`).

In local development, `useDb()` uses `pg` and `useRedis()` uses `ioredis`,
both pointed at the Docker containers from `docker-compose.yml`. The DB seam
returns a `Database` type without `.transaction()`; use `withTransaction(fn)`
for atomic writes; it throws when the configured driver cannot transact.
Better Auth receives the raw Drizzle handle, but the current auth configuration
does not enable the adapter's optional transaction mode. Verify auth persistence
against the deployment driver when changing that configuration. See
[ADR 0002](docs/adr/0002-database-capability-seam.md).

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
(`apps/api/server/api/auth/[...all].ts`). That route delegates to
`server/services/auth`, which validates password requests, filters bearer
credentials, and maps auth failures to the shared API error contract. Better
Auth uses the Drizzle adapter; sessions live in Postgres (`session` table).
The browser apps carry the session token in an
HttpOnly cookie; a native shell switches to a bearer token instead (see
[Native (Capacitor) app](#native-capacitor-app)).
Config is in `apps/api/server/database/auth.ts` (shared with the CLI and seed),
and server guards (`getActor`, `requireActor`) are in
`apps/api/server/utils/session.ts`.

Rate limiting is enabled (60-second window, 100 requests, with Better Auth's stricter
built-in rules for sensitive paths such as `/sign-in/email`) and its counters are
stored in Redis via the custom `consume` storage, so there is no rate-limit table
and no sessions in Redis. The API's own routes get the same Redis-backed limiter
(`apps/api/server/middleware/rate-limit.ts`). It limits `/api/*` requests per IP,
HTTP method, and path, excluding auth, health, and docs paths. The bare `/api`
registry is also exempt. `RATE_LIMIT_ENABLED=false` disables this middleware;
Better Auth's own limiter remains enabled.

The `@nuxt-app/client` layer wraps the Better Auth Vue client: `app` uses
`useAuth()` for sign-in/out, sign-up and session state; `admin` adds a global
route middleware requiring `actor.role === 'admin'`. `app` exposes open
registration at `/register` (new users get `role: 'user'`; only the seed user is
an admin).

Password screens use `usePasswordAuthScreen()` from `#imports` with the shared
`AuthScreen` component. That helper provides schemas, loading state, input
errors, and sanitized redirects. `useSignOut()` supplies sign-out loading state
and optional navigation after a successful sign-out. Admin route middleware
controls navigation; privileged API operations still need server authorization.

`web.nuxt-app.com` and `api.nuxt-app.com` are same-site, so `SameSite=Lax` cookies are
sent. `CORS_ORIGINS` lists the frontend origins for CORS and feeds Better
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
3. Add and export the `v2` contracts namespace in `packages/types`, including its
   `operations` list. Register it in `packages/config`'s `versionedOperations`.
4. Mark the old version in `deprecatedApiVersions` with a sunset date. Preserve
   the registry's `Object.freeze` wrapper.
5. Run `pnpm test --project unit test/version-parity.spec.ts` to check that
   routes, contract namespaces, and documented operations agree.
6. When retiring the old version after its sunset date, remove its routes,
   contract namespace, and version, operation, and deprecation registry entries.

Frontends target a version with `NUXT_PUBLIC_API_VERSION` (defaults to
`currentApiVersion`). Import `useApi` from `#imports` in apps extending the
client layer. It returns `{ api, parseApiError }`; `api` is a `$fetch` instance
scoped to `<apiBase>/api/<version>` (carrying the session per the
configured [session transport](#native-capacitor-app)). `useApiFetch()` provides
the SSR-aware Nuxt fetch path with the same authenticated client. Better Auth
keeps its own unversioned client internal to `useAuth()`.

For failed API requests, call `parseApiError`, branch on `error`, and map
`invalid_input` details to fields. See [backend patterns](docs/backend-patterns.md)
for the shared error contract.

## Native (Capacitor) app

A native shell hosts the SPA in a WebView, served from `capacitor://localhost`
(iOS) or `https://localhost` (Android). Every API call is therefore cross-origin,
and WebViews refuse the API's cross-origin `Set-Cookie`: the sign-in request
succeeds, the cookie is dropped, and the user is signed out again on the next
navigation. The shell uses the bearer transport instead ([ADR-0003](docs/adr/0003-bearer-tokens-for-native-clients.md)).

1. Set `AUTH_BEARER_ENABLED=true` on the API deployment. Set
   `AUTH_BEARER_ORIGINS` to the native WebView origins, for example
   `capacitor://localhost,https://localhost`, and add them to `CORS_ORIGINS`.
   The API exposes bearer credentials only to these origins. Leave browser app
   origins out of `AUTH_BEARER_ORIGINS` to retain their HttpOnly cookies.
2. Set `NUXT_PUBLIC_SESSION_TRANSPORT=bearer` in the app's environment.
   `useAuth()` and `useApi()` then send the session token in an `Authorization`
   header and stop using cookies. `sessionTransportFor()` keeps cookies for any
   other value.
3. Confirm the WebView origin on the device by logging `window.location.origin`.
   It comes from `server.iosScheme` or `server.androidScheme` and
   `server.hostname`. The defaults are `capacitor://localhost` on iOS and
   `https://localhost` on Android. `CORS_ORIGINS` also feeds Better Auth's
   `trustedOrigins`; a missing origin makes sign-in fail with `403`.
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
