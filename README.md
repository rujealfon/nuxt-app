# nuxt-app

A pnpm workspace with four independently deployed Nuxt apps and shared packages.

| App | Purpose | Local origin | Production hostname |
| --- | --- | --- | --- |
| `apps/web` | Prerendered public site | `http://localhost:3000` | `web.nuxt-app.com` |
| `apps/app` | User SPA | `http://localhost:3001` | `app.nuxt-app.com` |
| `apps/admin` | Admin SPA with role checks | `http://localhost:3002` | `admin.nuxt-app.com` |
| `apps/api` | Nitro API and Better Auth | `http://localhost:3003` | `api.nuxt-app.com` |

| Package | Purpose |
| --- | --- |
| `@nuxt-app/ui` | Nuxt layer with shared components, theme, VueUse, and `useSite()` |
| `@nuxt-app/client` | Nuxt layer with auth, authenticated HTTP clients, Pinia, and Pinia Colada |
| `@nuxt-app/types` | Zod schemas and inferred auth and API contract types |
| `@nuxt-app/config` | Site URLs, ports, API registries, and session transport settings |
| `@nuxt-app/logger` | Pino logger factory |

Web extends the UI layer. App and admin extend both layers. The API uses neither.

## Contributor guides

Apply [AGENTS.md](AGENTS.md) throughout the repository and read each app guide
before editing that app:

- [Web](apps/web/AGENTS.md) for prerendering and public navigation.
- [App](apps/app/AGENTS.md) for user auth screens and session behavior.
- [Admin](apps/admin/AGENTS.md) for role checks and login redirects.
- [API](apps/api/AGENTS.md) for endpoints, errors, and persistence.

For feature placement, public exports, or shared code, read
[architecture](docs/architecture.md). For protected operations, authorization,
transactions, or durable jobs, read [backend patterns](docs/backend-patterns.md).
The latter distinguishes implemented helpers from patterns to introduce later.

## Setup

1. Use the Node version range and pnpm version in [`package.json`](package.json).
   Install dependencies from the repository root:

   ```bash
   pnpm install
   ```

   Installation prepares Nuxt types for the apps and layers. Dependencies that
   need install scripts require entries in `pnpm-workspace.yaml`'s `allowBuilds`.

2. Copy examples for the apps you will run, preserving existing `.env` files:

   ```bash
   test -f apps/api/.env || cp apps/api/.env.example apps/api/.env
   test -f apps/web/.env || cp apps/web/.env.example apps/web/.env
   test -f apps/app/.env || cp apps/app/.env.example apps/app/.env
   test -f apps/admin/.env || cp apps/admin/.env.example apps/admin/.env
   ```

3. Replace the frontend examples' production origins with local origins:

   ```dotenv
   NUXT_PUBLIC_WEB_URL=http://localhost:3000
   NUXT_PUBLIC_APP_URL=http://localhost:3001
   NUXT_PUBLIC_ADMIN_URL=http://localhost:3002
   ```

   In app and admin, also set `NUXT_PUBLIC_API_BASE=http://localhost:3003`.
   In `apps/api/.env`, set:

   ```dotenv
   BETTER_AUTH_URL=http://localhost:3003
   CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002
   ```

   Generate `BETTER_AUTH_SECRET` with `openssl rand -base64 32`. Startup requires
   at least 32 characters, a valid auth URL, and non-empty `DATABASE_URL` and
   `REDIS_URL`. The API example uses the local Docker connection URLs.

4. For local auth or persistence, start Docker and initialize the database:

   ```bash
   pnpm db:up
   pnpm db:migrate
   ```

   `db:up` starts Postgres, Redis, and Drizzle Studio and creates the test database
   when missing. For a local admin account, follow [seeding](docs/database.md#seeding).

Setup is complete when each selected app starts. For API-backed authentication,
also verify that `GET /api/health/ready` succeeds against Postgres and Redis.

## Development

Run one app with `pnpm dev:web`, `pnpm dev:app`, `pnpm dev:admin`, or
`pnpm dev:api`. Run `pnpm dev` to start all four through Turbo. Ctrl+C stops the
supervised servers.

Before opening a local origin, confirm its listener belongs to this repository.
Another checkout can own the configured port. `pnpm dev:stop` kills every
listener on ports 3000-3003, including other projects; use it only when those
ports can be cleared.

For containers, migrations, test databases, Drizzle Studio, or optional local
subdomains, follow [database operations](docs/database.md).

## Lint

```bash
pnpm lint
pnpm lint:fix
pnpm lint:structure
```

`pnpm lint` runs ESLint through [`scripts/lint.mjs`](scripts/lint.mjs), then
Steiger. The runner uses separate workspace processes to keep type-aware
linting within Node's heap limit. `lint:fix` fixes ESLint only; rerun `lint`
afterward. There is no standalone formatter.

The `ts/no-deprecated` rule needs the Nuxt types generated at installation.
[`eslint.config.mjs`](eslint.config.mjs) defines its TypeScript scope, formatting,
and Tailwind rules. Add new frontend roots to `lint:structure` in `package.json`.

## Testing

Run `pnpm lint`, then `pnpm type-check`, then `pnpm test` before review.
Type checks cover Nuxt projects and the root `tsconfig.test.json`.

```bash
pnpm test
pnpm test:watch
pnpm test --project app
pnpm test --project unit test/version-parity.spec.ts
```

| Project | Scope |
| --- | --- |
| `unit` | Root checks, config/types/logger, API unit tests, client server tests |
| `api` | HTTP contracts against a built production Nitro server |
| `api-dev` | Scalar, OpenAPI, and docs assets against a development server |
| `redis` | Redis ping and the rate-limit Lua reply |
| `ui`, `client`, `web`, `app`, `admin` | Nuxt composables, components, middleware, and pages |

Local tests need no Docker. The Redis spec skips when `127.0.0.1:6381` is closed;
CI starts Redis there and fails if it is unavailable. The HTTP projects disable
the API middleware limiter and use `TEST_DATABASE_URL`. Existing HTTP tests need
no reachable database. New persistence tests must use a database whose name
ends in `_test`, deterministic setup and cleanup, and skip locally when it is
unreachable. Follow [test database setup](docs/database.md#test-database).

Name tests `*.spec.ts`. Put frontend tests under `app/` or `test/`, API unit tests
beside server code, and API HTTP tests in `apps/api/test/e2e/` or `e2e-dev/`.
[`vitest.config.ts`](vitest.config.ts) defines discovery and coverage. When adding
a frontend app, extend its `nuxtProject()` list. When adding a source root, check
coverage include globs and the `test:coverage:ci` project list.

CI runs on PRs and pushes to `main`, `develop`, and `release/**`. Its jobs are
`verify`, `vite-doctor`, `coverage`, and PR-only `commitlint`; their failures block
CI. Coverage enforces 90% thresholds and excludes HTTP and Redis projects.
Vite Doctor findings also block CI. Run `pnpm vite-doctor` locally and configure
rules in each Nuxt config's `doctor` key. See
[the CI workflow](.github/workflows/ci.yml) for the exact job definitions.

## Build

```bash
pnpm build
```

Run after export, Nuxt configuration, or routing changes; CI does not run the
workspace build. Declare variables read by Nuxt configs in `turbo.json`'s
`build.env` so Turbo passes and hashes shell overrides.
[`test/build-env.spec.ts`](test/build-env.spec.ts) checks direct `process.env`
property and literal bracket reads against that list.

For other workspace tasks and package filters, consult `package.json`.

## Dependencies

Dependabot's schedule, groups, and ignored majors are in
[`.github/dependabot.yml`](.github/dependabot.yml). Keep `@types/node` on the
runtime's Node major. For the Conventional Changelog compatibility constraint,
read [Releases](docs/releases.md).

## Operational guides

- Database setup, migrations, seeding, or managed drivers:
  [Database operations](docs/database.md).
- API version changes or native bearer transport:
  [API clients](docs/api-client.md).
- Release candidates, promotion, hotfixes, or GitHub branch settings:
  [Releases](docs/releases.md).
- Vercel configuration or production deployment:
  [Deployment](docs/deployment.md). It documents the release-only mode selected
  when `VERCEL_DEPLOYMENT_ENABLED` is unset or not `true`.

## License

This project is licensed under the [MIT License](LICENSE).
