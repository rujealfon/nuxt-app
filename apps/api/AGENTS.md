# API guide

Apply the [root guide](../../AGENTS.md). Paths below are relative to `apps/api`.

## Placement and imports

Keep handlers in `server/api/`, domain logic in `server/services/<domain>/`,
utilities in `server/utils/`, middleware in `server/middleware/`, and startup
hooks in `server/plugins/`. Export each service's public operations through
`index.ts`. Keep peer services independent; cross-domain orchestration belongs
in `server/workflows/`.

Inside a service, use `commands/<verb-noun>.ts` for use cases that return
`Result`, `queries/` for reads, `domain/<thing>-rules.ts` for pure rules, and a
private `<thing>-repository.ts`; create each only when needed. Services receive
`db` or a transaction handle as an argument. ESLint rejects importing
`#server/utils/db`, `nitropack/runtime`, `#imports`, `pg`, `drizzle-orm/node-postgres`, and
`createDb` there (types stay allowed); handlers or workflows wire `useDb()` and
pass runtime config, as the auth route does with `useRuntimeConfig(event)`. See
[ADR 0006](../../docs/adr/0006-service-layout-and-injected-database.md).

Use `#server/...` across server folders, including between subfolders of one
service, and `./...` within the same folder. ESLint rejects parent-relative
server imports. Outside services, import framework helpers from
`h3` or `nitropack/runtime`. Before adding business operations, follow
[backend patterns](../../docs/backend-patterns.md).

## Endpoints and errors

Put versioned handlers under `server/api/<version>/`, wrap them with
`defineVersionedHandler(version, ...)`, and call service entrypoints for domain
logic. Use response contracts from `@nuxt-app/types`. For a new or retired
version, follow [API versioning](../../docs/api-client.md#api-versioning).
Preserve version headers and JSON 404s for unknown routes.

Keep auth, health, the version registry, and docs routes unversioned.
`/api/docs`, `/api/openapi.json`, and `server/api/docs-assets/` are development
only. Keep Scalar assets as a route covered by `server/middleware/docs-guard.ts`;
production must return API contract 404s for docs and assets.

Authenticate with `requireActor(event)` and enforce resource permissions inside
the business operation. The guard establishes authentication only. Set
`authenticated: true` in the matching contract operation so OpenAPI includes
its security requirement and 401 response.

For error-envelope changes, read [ADR 0001](../../docs/adr/0001-api-error-contract.md),
[ADR 0004](../../docs/adr/0004-auth-error-contract.md), and
[ADR 0005](../../docs/adr/0005-result-for-domain-failures.md).
Services return `Result` (`ok`, `err`, `failure` from `server/utils/`) for
expected failures and throw only for unexpected ones. Handlers unwrap at the HTTP
edge: `defineResultHandler(fn)` (`server/utils/result-handler.ts`) for unversioned
routes that return a `Result`; `defineVersionedHandler(version, fn)` unwraps a
returned `Result<T>` itself, so a versioned handler returns the service's result
directly. ESLint
rejects a plain `defineEventHandler` or `eventHandler` in `server/api/` (specs
excepted); the seven exempt infra routes are listed in ADR 0005 and need no
`Result`. A handler that returns a raw `Result` fails as `internal_error`.
Middleware and guards such as `requireActor` throw `DomainFailure` at the h3 boundary.
Convert request validation failures with `invalidInputFromZod` and return it in
`err(...)`; an unhandled `ZodError` becomes `internal_error`. Preserve usable
input details, retry headers, and cookies. The auth catch-all delegates password
validation, bearer filtering, and Better Auth failure conversion to
`server/services/auth`, which returns a `Result` that `defineResultHandler` unwraps.

## Persistence and configuration

Keep database code in `server/database/`. Derive row-shaped payload schemas
from the tables with drizzle-zod in `server/database/row-schemas.ts`; see
[backend patterns](../../docs/backend-patterns.md). For generation, migrations,
seeding, and test-database commands, follow [database operations](../../docs/database.md).
Review the generated schema and SQL before applying migrations.

Before changing database access or transactions, read
[ADR 0002](../../docs/adr/0002-database-capability-seam.md).
Use `withTransaction(fn)` for transactions: `useDb()` and the transaction handle
have no `.transaction()`. Only Better Auth, `seed.ts`, and `better-auth.config.ts`
take the raw Drizzle client (`useRawDb()`, `createDb(...).rawDb`); verify auth
persistence against the test database.

`server/plugins/validate-env.ts` checks startup configuration. Keep secrets on
the server. For bearer auth changes, read
[ADR 0003](../../docs/adr/0003-bearer-tokens-for-native-clients.md) and follow
[native setup](../../docs/api-client.md#native-capacitor-app). Preserve credential
filtering for origins outside the configured native allowlist, including absent
origins.

## Tests

Colocate unit tests under `server/` and run `pnpm test --project unit`.
Put production HTTP tests in `test/e2e/` and development docs tests in
`test/e2e-dev/`; run the `api` and `api-dev` projects respectively.
For changed routes, check response bodies, statuses, version headers, and
failure paths. Follow [Testing](../../README.md#testing) for external-service
requirements and test-database isolation.
