# AGENTS.md

This file provides guidance when working with code in this repository.

## Commands

```bash
pnpm dev              # all apps via Turborepo (api:3001, app:3000, admin:3002, site:3003)
pnpm dev:api          # single app: turbo run dev --filter=@nuxt-app/api (also dev:app, dev:admin, dev:site)
pnpm build            # turbo run build (respects dependsOn: ["^build"])
pnpm type-check       # turbo run type-check
pnpm lint / lint:fix  # eslint . (root-level flat config, applies repo-wide)
pnpm db:generate      # drizzle-kit generate (run after editing packages/db/src/schema.ts)
pnpm db:migrate       # applies migrations (also runs automatically on API boot, see apps/api/src/index.ts)
pnpm db:studio        # drizzle-kit studio
pnpm db:seed          # seed an admin user, tsx apps/api/src/seed.ts
pnpm docker:up        # full stack via docker-compose (Postgres + all apps)
```

No test runner is configured in this repo.

Local dev without Docker: `docker compose up postgres -d`, copy `.env.example` to `.env`, `pnpm install`, `pnpm db:migrate`, then `pnpm dev`. Postgres runs on host port 5433 via Compose (5432 if run locally) to avoid colliding with a local Postgres install.

## Architecture

pnpm + Turborepo monorepo, three layers: `apps/*` (deployables), `layers/*` (Nuxt layers, extended by apps), `packages/*` (plain TS packages, no Nuxt).

- **apps/api** — Hono server (not Nuxt), custom session auth, talks directly to `@nuxt-app/db`.
- **apps/app**, **apps/admin** — Nuxt 4 apps that extend `layer-auth` + `layer-base`.
- **apps/site** — Nuxt 4 app, extends `layer-base` only (no auth).
- **layers/base** (`@nuxt-app/layer-base`) — Tailwind v4 + shared UI/Nitro config. Every Nuxt app depends on this.
- **layers/auth** (`@nuxt-app/layer-auth`) — provides `useAuth` composable and `auth`/`guest`/`admin` route middleware (`layers/auth/app/middleware/*.ts`) to any app that extends it.
- **packages/types** — plain interfaces (`User`, `AuthUser`, `LoginInput`, etc.) shared by API and frontend; no logic.
- **packages/auth** — HTTP client wrapping API auth endpoints, consumed by `layer-auth`'s `useAuth`.
- **packages/db** — Drizzle schema (`src/schema.ts`: `users`, `sessions` tables + `user_role` pgEnum), Postgres client, and `runMigrations()` (called on API boot in `apps/api/src/index.ts`).

Auth flow: `apps/api/src/lib/auth.ts` owns password hashing (bcrypt) and session CRUD against Postgres via `@nuxt-app/db`. `apps/api/src/middleware/auth.ts` exposes `sessionMiddleware`/`requireAuth`/`requireAdmin` for Hono routes. Sessions are opaque IDs in an httpOnly cookie (`nuxt_app_session`), not JWTs — `getSessionUser` joins `sessions` + `users` on every request. Frontend layer middleware (`layers/auth/app/middleware/*`) mirrors this by calling the API rather than reading cookies directly.

Cross-package imports use workspace protocol (`@nuxt-app/*`: `workspace:*`) — when changing a shared package's public surface (`packages/*/src/index.ts` exports), check all consuming apps/layers, not just the one you're editing.

Env vars are shared across all apps from repo-root `.env` (see `.env.example`): `DATABASE_URL`, `SESSION_SECRET`, `COOKIE_DOMAIN`, per-app `*_URL` vars used both for CORS allowlisting in `apps/api/src/index.ts` and for cross-subdomain cookie config in production.

Lint: `@antfu/eslint-config` (Vue + TypeScript + formatters) at repo root — no per-package eslint config.
