# Repository Guidelines

## Scope & Structure

Follow shared conventions and PR checks in [the root guide](../../AGENTS.md). This app provides Nitro HTTP endpoints on port 3003. Place handlers in `server/api/`, reusable domain logic in `server/services/<domain>/`, server utilities in `server/utils/`, request middleware in `server/middleware/`, and startup hooks in `server/plugins/`. Import services explicitly through each domain's `index.ts`; auto-imports are disabled, so import server utilities from `server/utils/` and h3/Nitro helpers from `h3` and `nitropack/runtime`.

## Development Commands

Run from the repository root:

- `pnpm dev:api`: start the API.
- `pnpm db:up`: start PostgreSQL, Redis, and Drizzle Studio.
- `pnpm --filter @nuxt-app/api build`: build the server.
- `pnpm --filter @nuxt-app/api type-check`: check server types.
- `pnpm test --project unit`: run server and shared-package unit tests.
- `pnpm test --project api`: run Nitro integration tests.

## Endpoint Conventions

When adding protected business operations, changing the API error contract, coordinating database writes, or introducing external side effects, read [the backend patterns guide](../../docs/backend-patterns.md). Its planned helpers must be implemented and tested before being treated as runtime behavior.

Keep versioned routes under `server/api/v1/` (or another registered version), named with HTTP suffixes such as `hello.get.ts`. Wrap them with `defineVersionedHandler('v1', ...)`, delegate domain logic to services, and use response schemas from `@nuxt-app/types`. Maintain the version registry in `packages/config` and a matching `vN` contracts namespace in `packages/types` when introducing versions (`test/version-parity.spec.ts` enforces the pair).

Keep `/api`, `/api/auth/*`, `/api/health*`, `/api/docs*`, and `/api/openapi.json` unversioned. The docs UI (`/api/docs`) renders the OpenAPI document (`/api/openapi.json`), which derives versioned-route schemas from `@nuxt-app/types` (including the v1 operation table) and infra 200s from `server/utils/infra.ts` via `server/utils/openapi.ts`; the Scalar bundle is self-hosted from the installed `@scalar/api-reference` package through a `server/api/docs-assets/` route (a route, not `publicAssets`, so the guard covers it). Only `standalone.js` is embedded as a server asset, and only in development (`$development` nitro assets). Docs are compile-time development-only behind `server/middleware/docs-guard.ts` (`import.meta.dev`); production builds 404 `/api/docs`, `/api/openapi.json`, and `/api/docs-assets/*` with the API error contract. There is no `DOCS_ENABLED` production opt-in. Preserve version headers and JSON 404 responses for unknown versioned routes. Use `requireActor(event)` for authenticated endpoints to get the trusted actor, and add role checks where required; the guard itself only checks authentication. Set `authenticated: true` on the matching `vN.operations` entry so the OpenAPI document renders the security requirement and a 401.

## Database & Configuration

Database code lives in `server/database/`; `auth-schema.ts` is generated through `pnpm --filter @nuxt-app/api db:auth:generate`. Generate and apply SQL migrations with the same package filter and `db:generate` / `db:migrate`. Review generated SQL before applying it.

Copy `.env.example` to `.env`; startup validation lives in `server/plugins/validate-env.ts`. PostgreSQL stores sessions, while Redis backs rate limiting. Coordinate CORS origins with frontend URLs and keep secrets server-side.

## Testing Guidelines

Colocate unit tests as `server/**/*.spec.ts`. Put HTTP contract tests in `test/e2e/`; they build and launch Nitro (production). Scalar docs that must be served are asserted against the dev server in `test/e2e-dev/`. Existing integration tests disable rate limiting and exercise routes without external services. Keep added tests self-contained through mocks or explicit fixtures. Verify response bodies, status codes, version headers, and failure paths when changing routing behavior.
