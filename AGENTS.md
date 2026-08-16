# AGENTS.md

This file provides guidance when working with code in this repository.

## Commands

```bash
pnpm dev              # all apps via Turborepo (api:3001, app:3000, admin:3002, web:3003)
pnpm dev:api          # single app: turbo run dev --filter=@nuxt-app/api (also dev:app, dev:admin, dev:web)
pnpm build            # turbo run build (respects dependsOn: ["^build"])
pnpm type-check       # turbo run type-check
pnpm lint / lint:fix  # eslint . (root-level flat config, applies repo-wide)
pnpm test             # turbo run test (API vitest via app.request(); uses nuxt_app_test)
pnpm db:generate      # drizzle-kit generate (run after editing packages/db/src/schema/)
pnpm db:migrate       # applies migrations (also runs automatically on API boot, see apps/api/src/index.ts)
pnpm db:studio        # drizzle-kit studio on the host
pnpm db:seed          # seed an admin user, tsx apps/api/src/seed.ts
```

Docker: [DOCKER.md](DOCKER.md) (`pnpm docker:up`, ports, images, Postgres 5433, Redis 6380).

API tests live in `apps/api/test/` and call the mounted Hono app via `app.request()` (no HTTP server). They use database `nuxt_app_test` on the same Postgres as `DATABASE_URL` (override with `DATABASE_URL_TEST`). Setup creates that database and runs migrations. Rate limiting uses an in-memory store in tests (no Redis).

Local host apps: Compose Postgres + Redis (see [DOCKER.md](DOCKER.md)), then `pnpm install`, `pnpm db:migrate`, `pnpm dev`.

## Architecture

pnpm + Turborepo monorepo, three layers: `apps/*` (deployables), `layers/*` (Nuxt layers, extended by apps), `packages/*` (plain TS packages, no Nuxt).

- **apps/api** — Hono server (not Nuxt). Feature modules live under `src/modules/*` and are mounted from `src/app.ts` with `app.route()`. Talks directly to `@nuxt-app/db`. A new API feature is a new `src/modules/<name>/` folder: define `createRoute` + `createRouter().openapi()` in `routes.ts` so the spec stays generated. Cross-cutting middleware stays in `src/middleware/`. Env is parsed once in `src/env.ts`. Logging is pino via `hono-pino` (`c.var.logger`, `LOG_LEVEL`). Scalar is at `http://localhost:3001/` when `NODE_ENV=development` (Compose API uses that). Spec: `/openapi.json` (generated from routes, not hand-written). Rate limit uses `hono-rate-limiter` `RedisStore` + node-redis over `REDIS_URL` (global skip `/`, `/health`, `OPTIONS`; tighter cap on `POST /auth/login` and `POST /auth/register`).
- **apps/app** — Nuxt 4 SPA (`ssr: false`) for the authenticated product. Extends `layer-auth` + `layer-base`.
- **apps/admin** — Nuxt 4 SPA (`ssr: false`) for admins. Extends `layer-auth` + `layer-base`.
- **apps/web** — Nuxt 4 SSG marketing site (`nuxt generate`, `nitro.preset: 'static'`). Extends `layer-base` only. Prefer prerender; do not add a Node server unless a page needs per-request data.
- **layers/base** (`@nuxt-app/layer-base`) — Tailwind v4 + `@nuxt/ui` + shared Nitro config. Every Nuxt app depends on this. Wrap pages in `UApp`.
- **layers/auth** (`@nuxt-app/layer-auth`) — Pinia Colada + `useAuth` (query key `['auth', 'me']`), `AuthLoginForm`/`AuthRegisterForm`, and `auth`/`guest`/`admin` route middleware.
- **packages/types** — shared Zod request schemas (`loginSchema`, `registerSchema`) plus inferred/plain types (`LoginInput`, `AuthUser`, …). API and Nuxt forms use the same schemas. Request bodies that are not table-shaped stay here; row/select Zod comes from drizzle-zod in `@nuxt-app/db`.
- **packages/auth** — Hono RPC client (`hc<AppType>` from `@nuxt-app/api/rpc`) for `/auth/*`, consumed by `layer-auth`'s `useAuth`.
- **packages/db** — Drizzle schema (`src/schema/`: `users`, `sessions` + `user_role` pgEnum), drizzle-zod select schemas (omit secrets like `passwordHash` from public shapes), Postgres client, and `runMigrations()` (called on API boot in `apps/api/src/index.ts`). PKs and FKs are `uuid` columns with SQL default `uuidv7()` (Postgres 18). Leave `id` off inserts and read it back with `.returning()`. Public API/URL identifiers are `users.public_id` (nanoid via `$defaultFn`). JSON `user.id` is that `public_id`, never the PK. Sessions stay PK-only (cookie secret). Path params that identify a user use `getParamsSchema({ validator: 'nanoid' })`.

Auth flow: `apps/api/src/modules/auth/` owns password hashing (bcrypt), session CRUD, cookies, and `/auth/*` routes. `src/middleware/` exposes `sessionMiddleware`/`requireAuth`/`requireAdmin`. Sessions are opaque IDs in an httpOnly cookie (`nuxt_app_session`), not JWTs — `getSessionUser` joins `sessions` + `users` on every request. Frontend layer middleware (`layers/auth/app/middleware/*`) mirrors this by calling the API rather than reading cookies directly.

`src/index.ts` is process boot (`runMigrations()` + `serve`). CORS allowlisting lives in `src/app.ts`.

Imports:

- Another package or layer: `@nuxt-app/db`, `@nuxt-app/types`, `@nuxt-app/auth`, `@nuxt-app/layer-base`, `@nuxt-app/layer-auth`. Do not add short aliases (`@db`, `@types`, `@auth`) — `@types` collides with DefinitelyTyped, and `@auth` is both a package and a layer.
- Same-app source: `@api/`, `@app/`, `@admin/`, `@web/` (that app's `src/` or `app/`).
- Inside `packages/*`: relative `./` to local files. Public surface stays `src/index.ts`.
- Layers: `extends: '@nuxt-app/layer-*'`. Components and composables are auto-imported. A specific layer file is `#layers/base` or `#layers/auth`.

When changing a shared package's public surface (`packages/*/src/index.ts` exports), check all consuming apps/layers, not just the one you're editing.

Env vars are shared across all apps from repo-root `.env` (see `.env.example`): `DATABASE_URL`, `REDIS_URL`, `SESSION_SECRET`, `COOKIE_DOMAIN`, per-app `*_URL` vars used both for CORS allowlisting in `apps/api/src/app.ts` and for cross-subdomain cookie config in production. Rate-limit knobs: `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`, `AUTH_RATE_LIMIT_MAX`. Log level: `LOG_LEVEL` (pino; tests use `silent`). A reverse proxy should overwrite `X-Forwarded-For`.

Lint: `@antfu/eslint-config` (Vue + TypeScript + formatters) at repo root — no per-package eslint config.
