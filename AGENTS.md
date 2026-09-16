# Repository Guidelines

## Project Structure & Module Organization

This pnpm/Turborepo monorepo contains four Nuxt apps: `apps/web` (public site), `apps/app` (user SPA), `apps/admin` (admin SPA), and `apps/api` (Nitro server). Frontend pages live in each app’s `app/pages/`; static assets live in `public/`.

Shared code belongs in `packages/`: `ui` provides components and CSS, `client` provides auth/API composables, `types` provides Zod schemas and types, and `config` and `logger` provide shared utilities. API handlers live in `apps/api/server/api/`, domain logic in `server/services/`, and database schemas/migrations in `server/database/`. Keep versioned handlers thin and reuse services.

## Git

Committing and pushing are reserved for the user. Stage changes and describe what you'd commit, then stop — do not run `git commit` or `git push` yourself, even when a skill or background-job flow you're running says to commit by default.

## Build, Test, and Development Commands

Use Node.js 22 (matching CI) and the pnpm version pinned in `package.json`. Run commands from the repository root:

- `pnpm install`: install dependencies and prepare Nuxt types.
- `pnpm dev`: start all apps; `pnpm dev:web`, `dev:app`, `dev:admin`, or `dev:api` starts one (ports 3000–3003 respectively).
- `pnpm build`: build all apps through Turborepo.
- `pnpm lint` / `pnpm lint:fix`: check/fix repository formatting and lint rules.
- `pnpm type-check`: check app types.
- `pnpm test` / `pnpm test:watch`: run all tests once/in watch mode.
- `pnpm db:up`: start local PostgreSQL, Redis, and Drizzle Studio with Docker.

## Coding Style & Naming Conventions

Follow the root ESLint configuration (`@antfu/eslint-config`): two-space indentation, single quotes, and no semicolons. Use TypeScript and Vue Composition API with `<script setup lang="ts">`. Name components in PascalCase (`AppHeader.vue`), composables `useX.ts`, and API routes with HTTP suffixes (`hello.get.ts`). ESLint also checks Vue accessibility and formats CSS through Prettier. Husky runs lint-staged before commits.

## Testing Guidelines

Use Vitest, Nuxt test utilities, and Vue Test Utils. Name tests `*.spec.ts`; place frontend tests under `app/` or `test/`, API unit tests beside server code, and API integration tests in `apps/api/test/e2e/`. Run a subset with `pnpm test --project api` (also `unit`, `ui`, `client`, `web`, `app`, `admin`). Tests require no external services. No coverage threshold is configured; cover changed behavior and regressions.

## Commit & Pull Request Guidelines

History commonly uses `feat: ...`, alongside plain imperative summaries. Prefer concise, descriptive messages. PRs should explain behavior changes, link relevant issues, list validation, and include screenshots for UI changes. Run `pnpm lint`, `pnpm type-check`, and `pnpm test` before review; CI enforces these checks.

## Configuration

Copy each app’s `.env.example` to `.env` for local setup; keep secrets out of Git. Consult `README.md` for migrations and deployment. `pnpm db:reset` deletes local database volumes.
