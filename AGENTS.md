# Repository guide

## Where code goes

This pnpm/Turbo workspace has four apps: `apps/web`, the prerendered public site; `apps/app`, the user SPA; `apps/admin`, the admin SPA; and `apps/api`, the Nitro server. Before editing an app, read its `AGENTS.md`. Keep app-specific code local and share code through `packages/`, never direct imports between apps.

For frontend features, new API domains, or code shared by multiple consumers, follow [the architecture guide](docs/architecture.md). Keep substantial frontend behavior in `app/features/<feature>/` and small pages in `app/pages/`. Import features and services through their selected `index.ts` exports; use relative implementation imports within a module. Keep versioned API handlers thin and domain logic in `apps/api/server/services/<domain>/`. Reserve `server/workflows/` for cross-domain orchestration.

When deciding where frontend code belongs or reorganizing it, read the [Feature-Sliced Design skill](.agents/skills/feature-sliced-design/SKILL.md). Use the architecture guide and app `AGENTS.md` for this repository's paths and import rules.

Before changing protected operations, authorization, API errors, transactions, or durable jobs, read [backend patterns](docs/backend-patterns.md). It distinguishes existing behavior from patterns that still need implementation. For error envelopes, database capabilities, or bearer authentication, also read the relevant ADR linked from [the API guide](apps/api/AGENTS.md).

## Code and imports

Follow the root ESLint config (`@antfu/eslint-config`): two-space indentation, single quotes, and no semicolons. Use TypeScript and Vue Composition API with `<script setup lang="ts">`. Name components in PascalCase, composables `useX.ts`, and API routes with HTTP suffixes such as `hello.get.ts`.

Tailwind class strings in `.vue` and `.ts` files are linted by `eslint-plugin-better-tailwindcss` (see `eslint.config.mjs`). Use theme tokens and scale values, avoid duplicate, conflicting, and deprecated classes, and let `pnpm lint:fix` sort them. The plugin reads `packages/ui/app/assets/css/main.css` as the shared Tailwind entry.

Nuxt auto-imports are disabled (`imports.autoImport: false`, `components.dirs: []`). Import Vue APIs from `vue`, Nuxt and shared composables from `#imports`, shared components from `@nuxt-app/ui/components/*`, and server helpers from `h3`, `nitropack/runtime`, or `server/utils/`. `@nuxt-app/client` is a Nuxt layer with no ordinary composable subpath exports; app and admin extend it and import its exposed composables through `#imports`.

## Setup and operations

Use Node 22.23.2 or newer within the 22.x line, matching CI, and the pnpm version pinned in `package.json`. Run commands from the repository root unless a filter is shown. `pnpm install` runs `nuxt:prepare` across apps and layers; dependencies with required install scripts need entries in `pnpm-workspace.yaml`'s `allowBuilds`.

Before running an app locally, copy its `.env.example` to `.env` if the file is absent. Frontend examples use production origins. Local web, app, and admin use ports 3000, 3001, and 3002; the API uses 3003. Set frontend URLs and API `CORS_ORIGINS` to the local origins. API startup requires `DATABASE_URL`, `REDIS_URL`, a valid `BETTER_AUTH_URL`, and a `BETTER_AUTH_SECRET` of at least 32 characters.

Use `pnpm dev:web`, `pnpm dev:app`, `pnpm dev:admin`, or `pnpm dev:api` for one app; `pnpm dev` starts all four. `pnpm dev:stop` kills every listener on ports 3000-3003, so use it only when those ports can be cleared.

`pnpm db:up` starts local Postgres, Redis, and Drizzle Studio. `pnpm db:reset` deletes their volumes; `pnpm db:push` skips migration files. Reserve both for disposable prototyping. Follow [the API guide](apps/api/AGENTS.md) for schema generation and migrations.

For Vercel deployment, follow the [README](README.md). Each project uses `apps/<name>` as its root and must include workspace files outside that directory.

## Tests and review

Before review, run `pnpm lint`, then `pnpm type-check`, then `pnpm test`. Lint uses the split-process ESLint runner in `scripts/lint.mjs`, then Steiger. `pnpm lint:fix` fixes ESLint only, so rerun `pnpm lint` afterward. There is no standalone repository formatter. When adding a frontend app, extend `lint:structure` and the `nuxtProject()` list in `vitest.config.ts`.

Focus workspace commands with `pnpm --filter @nuxt-app/<package> <script>` and tests with `pnpm test --project <name> [file]`. Vitest projects are `unit`, `api`, `api-dev`, `ui`, `client`, `web`, `app`, and `admin`. The full suite needs no Docker or other external service; `api` and `api-dev` launch real Nitro servers in production and development modes.

Use `*.spec.ts` for tests. Put frontend tests under `app/` or `test/`, API unit tests beside server code, and API HTTP tests in `apps/api/test/e2e/` or `apps/api/test/e2e-dev/`. Cover changed behavior and regressions. Extend coverage `include` globs and the `test:coverage:ci` project list when adding a source root if needed. That command enforces 90% thresholds and excludes the `api` and `api-dev` integration projects.

Keep tests of internal Nuxt behavior beside implementation so the app's TypeScript context includes them. Root `test/**` and `packages/{config,types,logger}` Node tests use `tsconfig.test.json` through `pnpm type-check`.

CI does not run `pnpm build`; run it locally for export, Nuxt config, or routing changes. Keep every environment variable read by Nuxt configs in `turbo.json`'s `build.env` list for strict environment filtering and caching. The current list is incomplete, including API-version, session-transport, and bearer settings.

PRs should explain behavior changes, link issues, list validation, and include screenshots for visible UI changes. Do not run `git commit` or `git push`; those operations are reserved for the user.

## Issues and domain docs

When creating or updating a local issue or spec, follow [the issue tracker guide](docs/agents/issue-tracker.md). When triaging, use the values in [triage labels](docs/agents/triage-labels.md). When a task turns on domain terminology or an ADR decision, follow [the domain docs guide](docs/agents/domain.md).
