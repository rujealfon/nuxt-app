# Repository guide

## Where code goes

This pnpm/Turbo workspace has four apps: `apps/web`, the prerendered public site; `apps/app`, the user SPA; `apps/admin`, the admin SPA; and `apps/api`, the Nitro server. Before editing an app, read its `AGENTS.md`. Keep app-specific code local and share code through `packages/`, never direct imports between apps.

For frontend features, new API domains, or code shared by multiple consumers, follow [the architecture guide](docs/architecture.md). Keep substantial frontend behavior in `app/features/<feature>/` and small pages in `app/pages/`. Import features and services through their selected `index.ts` exports; use relative implementation imports within a module. Keep versioned API handlers thin and domain logic in `apps/api/server/services/<domain>/`. Reserve `server/workflows/` for cross-domain orchestration.

When deciding where frontend code belongs or reorganizing it, read the [Feature-Sliced Design skill](.agents/skills/feature-sliced-design/SKILL.md). Use the architecture guide and app `AGENTS.md` for this repository's paths and import rules.

Before changing protected operations, authorization, API errors, transactions, or durable jobs, read [backend patterns](docs/backend-patterns.md). It distinguishes existing behavior from patterns that still need implementation. For error envelopes, database capabilities, or bearer authentication, also read the relevant ADR linked from [the API guide](apps/api/AGENTS.md).

## Code and imports

Follow [the ESLint config](eslint.config.mjs) for formatting and Tailwind classes. Use TypeScript and Vue Composition API with `<script setup lang="ts">`. Name components in PascalCase, composables `useX.ts`, and API routes with HTTP suffixes such as `hello.get.ts`.

Use theme tokens and scale values for Tailwind classes. The shared Tailwind entry is `packages/ui/app/assets/css/main.css`.

Nuxt auto-imports are disabled (`imports.autoImport: false`, `components.dirs: []`). Import Vue APIs from `vue`, Nuxt and shared composables from `#imports`, shared components from `@nuxt-app/ui/components/*`, and server helpers from `h3`, `nitropack/runtime`, or `server/utils/`. `@nuxt-app/client` is a Nuxt layer with no ordinary composable subpath exports; app and admin extend it and import its exposed composables through `#imports`.

## Setup and operations

Use Node 22.23.2 or newer within the 22.x line, matching CI, and the pnpm version pinned in `package.json`. Keep `@types/node` on 22. A newer major describes APIs from a later Node line. Dependabot ignores that major update. Run commands from the repository root unless a filter is shown. `pnpm install` runs `nuxt:prepare` across apps and layers; dependencies with required install scripts need entries in `pnpm-workspace.yaml`'s `allowBuilds`.

Before running an app locally, copy its `.env.example` to `.env` if the file is absent. Frontend examples use production origins. Local web, app, and admin use ports 3000, 3001, and 3002; the API uses 3003. Set frontend URLs and API `CORS_ORIGINS` to the local origins. API startup requires `DATABASE_URL`, `REDIS_URL`, a valid `BETTER_AUTH_URL`, and a `BETTER_AUTH_SECRET` of at least 32 characters.

Use `pnpm dev:web`, `pnpm dev:app`, `pnpm dev:admin`, or `pnpm dev:api` for one app; `pnpm dev` starts all four. `pnpm dev:stop` kills every listener on ports 3000-3003, so use it only when those ports can be cleared.

`pnpm db:up` starts local Postgres, Redis, and Drizzle Studio. `pnpm db:reset` deletes their volumes; `pnpm db:push` skips migration files. Reserve both for disposable prototyping. Follow [the API guide](apps/api/AGENTS.md) for schema generation and migrations.

Dependency updates arrive as Dependabot pull requests. Review the version change. Configuration is in [`.github/dependabot.yml`](.github/dependabot.yml). See [Dependencies](README.md#dependencies).

For Vercel deployment, follow the [manual production deployment guide](README.md#manual-production-deployment), including the temporary release-only mode while Vercel is unconfigured. Merging into `main` runs CI; manually run `Deploy production` after CI succeeds to deploy and publish. Each project uses `apps/<name>` as its root and must include workspace files outside that directory. Staging and UAT setup remains documented only.

## Tests and review

Before review, run `pnpm lint`, then `pnpm type-check`, then `pnpm test`. Lint uses the split-process ESLint runner in `scripts/lint.mjs`, then Steiger. `pnpm lint:fix` fixes ESLint only, so rerun `pnpm lint` afterward. There is no standalone repository formatter. When adding a frontend app, extend `lint:structure` and the `nuxtProject()` list in `vitest.config.ts`.

Focus workspace commands with `pnpm --filter @nuxt-app/<package> <script>` and tests with `pnpm test --project <name> [file]`. Vitest projects are `unit`, `api`, `api-dev`, `redis`, `ui`, `client`, `web`, `app`, and `admin`. Local `pnpm test` needs no Docker: the `redis` project skips unless Redis is listening on `127.0.0.1:6381` (`pnpm db:up`). CI verify starts `redis:8-alpine` on that port and fails the spec when the port is closed. `api` and `api-dev` launch real Nitro servers in production and development modes.

Use `*.spec.ts` for tests. Put frontend tests under `app/` or `test/`, API unit tests beside server code, and API HTTP tests in `apps/api/test/e2e/` or `apps/api/test/e2e-dev/`. Cover changed behavior and regressions. Extend coverage `include` globs and the `test:coverage:ci` project list when adding a source root if needed. That command enforces 90% thresholds and excludes the `api`, `api-dev`, and `redis` projects.

Keep tests of internal Nuxt behavior beside implementation so the app's TypeScript context includes them. Root `test/**` and `packages/{config,types,logger}` Node tests use `tsconfig.test.json` through `pnpm type-check`.

Run `pnpm build` for export, Nuxt config, or routing changes. Follow [the build guide](README.md#build) for Turbo environment declarations and their automated check.

PRs should explain behavior changes, link issues, list validation, and include screenshots for visible UI changes. Do not run `git commit` or `git push`; those operations are reserved for the user.

## Commits and releases

Write commit messages and PR titles in [Conventional Commits](https://www.conventionalcommits.org/); rules are in `commitlint.config.js`. For generated messages, use the `conventional-commit-message` skill in `.agents/skills/`.

When preparing a release, promotion, or hotfix, follow [the release workflow](README.md#release-workflow). For semantic-release behavior and dependency constraints, read [Releases](README.md#releases).

## Agent skills

### Issue tracker

When creating or updating a local issue or spec, follow [the issue tracker guide](docs/agents/issue-tracker.md). Issues and specs live as markdown files under `.scratch/<feature>/`.

### Triage labels

When triaging, use the values in [triage labels](docs/agents/triage-labels.md). The five canonical roles use their own names: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix`.

### Domain docs

When a task turns on domain terminology or an ADR decision, follow [the domain docs guide](docs/agents/domain.md). Single-context: one root `GLOSSARY.md` and ADRs in `docs/adr/`.

<!-- BEGIN:turborepo-agent-rules -->

## This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
