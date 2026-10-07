# Repository guide

## Start here

Read the `AGENTS.md` in each app you will edit. For setup and local servers,
follow [README setup](README.md#setup) and [development](README.md#development).
Use the Node and pnpm versions declared in `package.json`; keep `@types/node`
on the same Node major. Run commands from the repository root.

For frontend placement, new API domains, or shared code, read
[architecture](docs/architecture.md). For frontend placement or reorganization,
also read the [Feature-Sliced Design skill](.agents/skills/feature-sliced-design/SKILL.md).
Apps share code through `packages/`; direct imports between apps are prohibited.

## Code conventions

Use TypeScript and Vue Composition API with `<script setup lang="ts">`.
Name components in PascalCase, composables `useX.ts`, and API routes with HTTP
suffixes such as `hello.get.ts`. Follow [ESLint](eslint.config.mjs) for formatting
and Tailwind classes. Use theme tokens and scale values from the shared
Tailwind entry, `packages/ui/app/assets/css/main.css`.

Nuxt auto-imports are disabled. Import Vue APIs from `vue`, Nuxt and layer
composables from `#imports`, and shared components from
`@nuxt-app/ui/components/*`. The client package is a Nuxt layer; its composables
are available through `#imports` in apps that extend it. Import server helpers
from `h3`, `nitropack/runtime`, or explicitly from server utilities.

## Verification

Before handing off changes, run `pnpm lint`, then `pnpm type-check`, then
`pnpm test`. Report failed or blocked checks. `pnpm lint:fix` fixes ESLint only;
rerun `pnpm lint` afterward. The repository has no standalone formatter.

Use `*.spec.ts` for tests. Colocate tests of internal Nuxt behavior so they use
the app's TypeScript context. For test projects, service requirements, coverage,
and new source roots, follow [Testing](README.md#testing).
Run `pnpm build` after export, Nuxt configuration, or routing changes and follow
[Build](README.md#build) for environment declarations.

PRs explain behavior changes, link issues, list validation, and include
screenshots for visible UI changes. Use Conventional Commits for PR titles and
commit messages, following `commitlint.config.js`. For generated commit
messages, use the `conventional-commit-message` skill. Leave `git commit` and
`git push` to the user; do not run either command.

## Task-specific guides

- Protected operations, authorization, API errors, transactions, or durable
  jobs: read [backend patterns](docs/backend-patterns.md). It separates existing
  behavior from patterns to introduce when needed. For error envelopes, database
  capabilities, or bearer auth, also read the ADRs linked in the
  [API guide](apps/api/AGENTS.md).
- Database setup, schema generation, migrations, or seeding: follow
  [database operations](docs/database.md). Reserve `db:reset` and `db:push` for
  disposable databases.
- Dependency updates: read [Dependencies](README.md#dependencies).
- Vercel setup or production deployment: follow [deployment](docs/deployment.md).
- Releases, candidate promotion, or hotfixes: follow [releases](docs/releases.md).
- New API versions or native client transport: follow [API clients](docs/api-client.md).
- Local issues or specs: follow [issue tracker](docs/agents/issue-tracker.md).
- Triage: use [triage labels](docs/agents/triage-labels.md).
- Domain terminology or ADR decisions: follow [domain docs](docs/agents/domain.md).

<!-- BEGIN:turborepo-agent-rules -->

## This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
