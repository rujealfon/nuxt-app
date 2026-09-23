# Repository guidelines

## Scope and structure

Put handlers in `server/api/`, domain logic in `server/services/<domain>/`, utilities
in `server/utils/`, middleware in `server/middleware/`, and startup hooks in
`server/plugins/`. Import each service through its domain's `index.ts`. Import
utilities from `server/utils/` and framework helpers from `h3` or
`nitropack/runtime`.

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

Use `requireActor(event)` to authenticate endpoints, then check roles where
needed. The guard only checks authentication. Set `authenticated: true` on the
matching `vN.operations` entry so OpenAPI shows the security requirement and a
401 response. Keep `/api/auth/*` failures on the API error contract.
`server/api/auth/[...all].ts` converts Better Auth errors and validates the
password flows against shared schemas so `invalid_input` carries `details`.
See [ADR 0004](../../docs/adr/0004-auth-error-contract.md).

## Database and configuration

Database code lives in `server/database/`. Generate `auth-schema.ts` with
`pnpm --filter @nuxt-app/api db:auth:generate`. Use the same package filter with
`db:generate` and `db:migrate` for SQL migrations. Review generated SQL before
applying it.

`server/plugins/validate-env.ts` validates the environment at startup.
PostgreSQL stores sessions; Redis backs rate limiting.
Keep CORS origins aligned with frontend URLs and secrets on the server.

## Testing guidelines

Put unit tests beside server code as `server/**/*.spec.ts`. HTTP contract tests
in `test/e2e/` build and launch Nitro in production mode. Tests for development
only Scalar docs use the dev server in `test/e2e-dev/`. Existing integration
tests disable rate limiting and need no external services. Use mocks or explicit
fixtures for new tests. When changing routes, check response bodies, status
codes, version headers, and failure paths.
