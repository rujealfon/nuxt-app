# API guide

Read the [root guide](../../AGENTS.md) for workspace setup and verification.

## Scope and structure

Put handlers in `server/api/`, domain logic in `server/services/<domain>/`, utilities
in `server/utils/`, middleware in `server/middleware/`, and startup hooks in
`server/plugins/`. Import each service through its domain's `index.ts`. Import
utilities from `server/utils/` and framework helpers from `h3` or
`nitropack/runtime`. Keep peer services independent and put cross-domain
orchestration in `server/workflows/` when needed. Before adding business
operations, follow [backend patterns](../../docs/backend-patterns.md).

## Endpoint conventions

Put versioned routes under `server/api/v1/` or another registered version. Name
them with HTTP suffixes such as `hello.get.ts`. Wrap routes with
`defineVersionedHandler('v1', ...)`, call services for domain logic, and use
response schemas from `@nuxt-app/types`. When adding a version, update the
registry in `packages/config` and its `vN` contracts namespace in
`packages/types`. `test/version-parity.spec.ts` checks the pair.

Keep `/api`, `/api/auth/*`, `/api/health*`, `/api/docs*`, and
`/api/openapi.json` unversioned. Preserve version headers and JSON 404 responses
for unknown versioned routes.

`/api/docs` renders `/api/openapi.json`, which uses contracts from
`@nuxt-app/types` and schemas for unversioned routes. Keep Scalar's
`server/api/docs-assets/` as a route so `server/middleware/docs-guard.ts` covers
it. The docs and assets are development only; production returns API contract
404s. There is no production `DOCS_ENABLED` setting.

Use `requireActor(event)` to authenticate endpoints, then enforce resource
permissions inside the business operation. The guard only checks authentication.
Set `authenticated: true` on the
matching `vN.operations` entry so OpenAPI shows the security requirement and a
401 response. Keep `/api/auth/*` failures on the API error contract.
`server/api/auth/[...all].ts` delegates to `server/services/auth`, which validates
password flows, filters bearer credentials, and converts Better Auth failures.
Before changing error envelopes, read
[ADR 0001](../../docs/adr/0001-api-error-contract.md) and
[ADR 0004](../../docs/adr/0004-auth-error-contract.md). Convert request validation
failures explicitly with `invalidInputFromZod`; an unhandled `ZodError` becomes
`internal_error`. Preserve usable input `details`, retry headers, and cookies.

## Database and configuration

Database code lives in `server/database/`. After changing Better Auth
configuration, run `pnpm db:auth:generate`, then `pnpm db:generate`. Review
`auth-schema.ts` and the generated SQL before `pnpm db:migrate`. Drizzle loads
`DATABASE_URL` from `apps/api/.env` or the process environment, even during
generation. `pnpm db:test:*` manages a separate `nuxt_app_test` database through
`TEST_DATABASE_URL`; a guard refuses database names that do not end in `_test`,
so tests and test scripts cannot reach `nuxt_app_db`. The auth generator is
pinned to 1.7.4 while the runtime dependency is `better-auth ^1.7.5`; review
that split before changing either version.

Before changing database drivers or transaction behavior, read
[ADR 0002](../../docs/adr/0002-database-capability-seam.md). `useDb()` omits
`.transaction()`; call `withTransaction(fn)`, which throws on neon-http.
Better Auth uses the raw Drizzle adapter, so verify its transaction requirements
against the deployment driver when changing persistence.

`server/plugins/validate-env.ts` validates the environment at startup.
PostgreSQL stores sessions; Redis backs rate limiting.
Keep CORS origins aligned with frontend URLs and secrets on the server.
Before changing bearer authentication, read
[ADR 0003](../../docs/adr/0003-bearer-tokens-for-native-clients.md).
`AUTH_BEARER_ENABLED=true` requires explicit native `AUTH_BEARER_ORIGINS` allowed
by `CORS_ORIGINS`. Keep browser origins outside that bearer list and preserve
credential filtering for other or missing origins.

## Testing guidelines

Put unit tests beside server code as `server/**/*.spec.ts` and run them with
`pnpm test --project unit`. HTTP contract tests
in `test/e2e/` build and launch Nitro in production mode. Tests for development
only Scalar docs use the dev server in `test/e2e-dev/`. Run these with the `api`
and `api-dev` projects respectively. The `redis` project checks `ping()` and
the rate-limit Lua reply against Redis on `127.0.0.1:6381`. It skips when that
port is closed; CI verify fails it when the port is closed. Existing HTTP
integration tests disable rate limiting and need no external services. The
`api` and `api-dev` projects point `DATABASE_URL` at `nuxt_app_test`; specs that
need the database should skip when it is unreachable, like the `redis` project.
Use mocks or explicit fixtures for new tests. When changing routes, check
response bodies, status codes, version headers, and failure paths.
