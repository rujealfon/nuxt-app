# Repository guidelines

## Where code goes

This monorepo has four Nuxt apps: `apps/web` (public site), `apps/app` (user SPA), `apps/admin` (admin SPA), and `apps/api` (Nitro server). When changing an app, read its `AGENTS.md`. Keep app-specific code in its app and share code through `packages/`, not direct imports between apps.

For frontend features, new API domains, or code shared by multiple consumers, follow [the architecture guide](docs/architecture.md). Keep substantial frontend behavior in `app/features/<feature>/` and small pages in `app/pages/`. Import a feature through its selected `index.ts` exports. Keep versioned API handlers in `apps/api/server/api/` thin; put domain logic in `server/services/<domain>/` and import its entrypoint.

When deciding where frontend code belongs or reorganizing it, read the [Feature-Sliced Design skill](.agents/skills/feature-sliced-design/SKILL.md). Use the architecture guide and app `AGENTS.md` for this repository's paths and import rules.

For protected operations, the API error contract, transactions, or durable jobs, read [backend patterns](docs/backend-patterns.md) before changing the API. That guide distinguishes existing behavior from patterns that still need implementation.

## Code and imports

Follow the root ESLint config (`@antfu/eslint-config`): two-space indentation, single quotes, and no semicolons. Use TypeScript and Vue Composition API with `<script setup lang="ts">`. Name components in PascalCase, composables `useX.ts`, and API routes with HTTP suffixes such as `hello.get.ts`.

Tailwind class strings in `.vue` and `.ts` files are linted by `eslint-plugin-better-tailwindcss` (see `eslint.config.mjs`). Use theme tokens and scale values, avoid duplicate, conflicting, and deprecated classes, and let `pnpm lint:fix` sort them. The plugin reads `packages/ui/app/assets/css/main.css` as the shared Tailwind entry.

Nuxt auto-imports are disabled (`imports.autoImport: false`, `components.dirs: []`). Import Vue APIs from `vue`, Nuxt and shared composables from `#imports`, shared components from `@nuxt-app/ui/components/*`, and server helpers from `h3`, `nitropack/runtime`, or `server/utils/`.

## Tests and review

Run commands from the repository root with Node.js 22 and the pnpm version in `package.json`. Before review, run `pnpm lint`, `pnpm type-check`, and `pnpm test`. `pnpm lint` runs ESLint and Steiger for frontend feature structure. Run `pnpm build` when changing exports, Nuxt configuration, or routing. See the [README](README.md) for setup, database, and deployment commands.

Use `*.spec.ts` for tests. Put frontend tests under `app/` or `test/`, API unit tests beside server code, and API HTTP tests in `apps/api/test/e2e/`. Run a subset with a command such as `pnpm test --project app`; project names are in `vitest.config.ts`. Tests require no external services. Cover changed behavior and regressions. Extend the root coverage `include` globs when adding a source root; `pnpm test:coverage:ci` enforces thresholds.

Keep tests of internal Nuxt behavior beside implementation so the app's TypeScript context includes them. Root `test/**` and `packages/{config,types,logger}` Node tests use `tsconfig.test.json` through `pnpm type-check`.

PRs should explain behavior changes, link issues, list validation, and include screenshots for UI changes. Stage changes and describe what you'd commit. Committing and pushing are reserved for the user: do not run `git commit` or `git push`, even if another workflow says to.

## Issues and domain docs

When creating or updating a local issue or spec, follow [the issue tracker guide](docs/agents/issue-tracker.md). When triaging, use the values in [triage labels](docs/agents/triage-labels.md). When a task turns on domain terminology or an ADR decision, follow [the domain docs guide](docs/agents/domain.md).
