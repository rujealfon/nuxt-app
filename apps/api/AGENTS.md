# Repository Guidelines

## Scope & Structure

Follow shared conventions and PR checks in [the root guide](../../AGENTS.md). This app provides Nitro HTTP endpoints on port 3003. Place handlers in `server/api/`, reusable domain logic in `server/services/<domain>/`, infrastructure helpers in `server/utils/`, request middleware in `server/middleware/`, and startup hooks in `server/plugins/`. Import services explicitly through each domain’s `index.ts`; only infrastructure utilities retain Nuxt auto-imports.

## Development Commands

Run from the repository root:

- `pnpm dev:api`: start the API.
- `pnpm db:up`: start PostgreSQL, Redis, and Drizzle Studio.
- `pnpm --filter @nuxt-app/api build`: build the server.
- `pnpm --filter @nuxt-app/api type-check`: check server types.
- `pnpm test --project unit`: run server and shared-package unit tests.
- `pnpm test --project api`: run Nitro integration tests.

## Endpoint Conventions

When adding protected business operations, changing error responses, coordinating database writes, or introducing external side effects, read [the backend patterns guide](../../docs/backend-patterns.md). Its planned helpers and error mapping must be implemented and tested before being treated as runtime behavior.

Keep product endpoints under `server/api/v1/` (or another registered version), named with HTTP suffixes such as `hello.get.ts`. Wrap them with `defineVersionedHandler('v1', ...)`, delegate domain logic to services, and use response schemas from `@nuxt-app/types`. Maintain the version registry in `packages/config` when introducing versions.

Keep `/api/auth/*` and `/api/health*` unversioned. Preserve version headers and JSON 404 responses for unknown product routes. Use `requireUser(event)` for authenticated endpoints and add role checks where required; it only checks authentication.

## Database & Configuration

Database code lives in `server/database/`; `auth-schema.ts` is generated through `pnpm --filter @nuxt-app/api db:auth:generate`. Generate and apply SQL migrations with the same package filter and `db:generate` / `db:migrate`. Review generated SQL before applying it.

Copy `.env.example` to `.env`; startup validation lives in `server/plugins/validate-env.ts`. PostgreSQL stores sessions, while Redis backs rate limiting. Coordinate CORS origins with frontend URLs and keep secrets server-side.

## Testing Guidelines

Colocate unit tests as `server/**/*.spec.ts`. Put HTTP contract tests in `test/e2e/`; they build and launch Nitro. Existing integration tests disable rate limiting and exercise routes without external services. Keep added tests self-contained through mocks or explicit fixtures. Verify response bodies, status codes, version headers, and failure paths when changing routing behavior.
