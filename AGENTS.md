# AGENTS.md

This file provides guidance when working with code in this repository.

## Commands

```bash
pnpm dev              # all apps via Turborepo (api:3001, app:3000, admin:3002, site:3003)
pnpm dev:api          # single app: turbo run dev --filter=@nuxt-app/api (also dev:app, dev:admin, dev:site)
pnpm build            # turbo run build (respects dependsOn: ["^build"])
pnpm type-check       # turbo run type-check
pnpm lint / lint:fix  # eslint . (root-level flat config, applies repo-wide)
pnpm --filter @nuxt-app/api test  # vitest via app.request() — no live server
pnpm db:generate      # drizzle-kit generate (run after editing packages/db/src/schema/)
pnpm db:migrate       # applies migrations (also runs automatically on API boot, see apps/api/src/index.ts)
pnpm db:studio        # drizzle-kit studio
pnpm db:seed          # seed an admin user, tsx apps/api/src/seed.ts
pnpm docker:up        # full stack via docker-compose (Postgres + all apps)
```

API tests live in `apps/api/test/` and call the mounted Hono app via `app.request()` (no HTTP server).

Local dev without Docker: `docker compose up postgres -d`, copy `.env.example` to `.env`, `pnpm install`, `pnpm db:migrate`, then `pnpm dev`. Postgres runs on host port 5433 via Compose (5432 if run locally) to avoid colliding with a local Postgres install.

## Architecture

pnpm + Turborepo monorepo, three layers: `apps/*` (deployables), `layers/*` (Nuxt layers, extended by apps), `packages/*` (plain TS packages, no Nuxt).

- **apps/api** — Hono server (not Nuxt). Feature modules live under `src/modules/*` and are mounted from `src/app.ts` with `app.route()`. Talks directly to `@nuxt-app/db`. A new API feature is a new `src/modules/<name>/` folder (start with `routes.ts`). Cross-cutting middleware stays in `src/middleware/`. Env is parsed once in `src/env.ts`.
- **apps/app** — Nuxt 4 SPA (`ssr: false`) for the authenticated product. Extends `layer-auth` + `layer-base`.
- **apps/admin** — Nuxt 4 SPA (`ssr: false`) for admins. Extends `layer-auth` + `layer-base`.
- **apps/site** — Nuxt 4 SSG marketing site (`nuxt generate`, `nitro.preset: 'static'`). Extends `layer-base` only. Prefer prerender; do not add a Node server unless a page needs per-request data.
- **layers/base** (`@nuxt-app/layer-base`) — Tailwind v4 + `@nuxt/ui` + shared Nitro config. Every Nuxt app depends on this. Wrap pages in `UApp`.
- **layers/auth** (`@nuxt-app/layer-auth`) — Pinia Colada + `useAuth` (query key `['auth', 'me']`), `AuthLoginForm`/`AuthRegisterForm`, and `auth`/`guest`/`admin` route middleware.
- **packages/types** — shared Zod request schemas (`loginSchema`, `registerSchema`) plus inferred/plain types (`LoginInput`, `AuthUser`, …). API and Nuxt forms use the same schemas.
- **packages/auth** — Hono RPC client (`hc<AppType>` from `@nuxt-app/api/rpc`) for `/auth/*`, consumed by `layer-auth`'s `useAuth`.
- **packages/db** — Drizzle schema (`src/schema/`: `users`, `sessions` + `user_role` pgEnum), Postgres client, and `runMigrations()` (called on API boot in `apps/api/src/index.ts`). IDs stay nanoid text — do not switch to identity columns.

Auth flow: `apps/api/src/modules/auth/` owns password hashing (bcrypt), session CRUD, cookies, and `/auth/*` routes. `src/middleware/` exposes `sessionMiddleware`/`requireAuth`/`requireAdmin`. Sessions are opaque IDs in an httpOnly cookie (`nuxt_app_session`), not JWTs — `getSessionUser` joins `sessions` + `users` on every request. Frontend layer middleware (`layers/auth/app/middleware/*`) mirrors this by calling the API rather than reading cookies directly.

`src/index.ts` is process boot (`runMigrations()` + `serve`). CORS allowlisting lives in `src/app.ts`.

Imports:

- Another package or layer: `@nuxt-app/db`, `@nuxt-app/types`, `@nuxt-app/auth`, `@nuxt-app/layer-base`, `@nuxt-app/layer-auth`. Do not add short aliases (`@db`, `@types`, `@auth`) — `@types` collides with DefinitelyTyped, and `@auth` is both a package and a layer.
- Same-app source: `@api/`, `@app/`, `@admin/`, `@site/` (that app's `src/` or `app/`).
- Inside `packages/*`: relative `./` to local files. Public surface stays `src/index.ts`.
- Layers: `extends: '@nuxt-app/layer-*'`. Components and composables are auto-imported. A specific layer file is `#layers/base` or `#layers/auth`.

When changing a shared package's public surface (`packages/*/src/index.ts` exports), check all consuming apps/layers, not just the one you're editing.

Env vars are shared across all apps from repo-root `.env` (see `.env.example`): `DATABASE_URL`, `SESSION_SECRET`, `COOKIE_DOMAIN`, per-app `*_URL` vars used both for CORS allowlisting in `apps/api/src/app.ts` and for cross-subdomain cookie config in production.

Lint: `@antfu/eslint-config` (Vue + TypeScript + formatters) at repo root — no per-package eslint config.
