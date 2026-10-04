<!--
Sync Impact Report
- Version change: unratified template → 1.0.0
- Modified principles:
  - PRINCIPLE_1_NAME → I. Independent applications
  - PRINCIPLE_2_NAME → II. Explicit module boundaries
  - PRINCIPLE_3_NAME → III. Server authority
  - PRINCIPLE_4_NAME → IV. Published contracts
  - PRINCIPLE_5_NAME → V. Proven changes
- Added sections:
  - Technology and security constraints (replaces SECTION_2_NAME)
  - Delivery workflow (replaces SECTION_3_NAME)
  - Governance rules (filled)
- Removed sections: none
- Follow-up TODOs: none
-->

# nuxt-app Constitution

## Core Principles

### I. Independent applications

`apps/web`, `apps/app`, `apps/admin`, and `apps/api` MUST stay independently
deployable. An application MUST NOT import another application. Shared code
MUST live in `packages/`. A package MUST NOT depend on an application.
Frontend code MUST call server operations through HTTP and shared contracts.
The API MUST remain one application until a separate deployment has a
concrete benefit.

Rationale: each app ships on its own. A direct import would couple release
and runtime.

### II. Explicit module boundaries

Substantial frontend behavior MUST live in `app/features/<feature>/`. Files in
`app/pages/` MUST stay small and MUST compose feature exports. Peer features
MUST stay independent of each other and of application composition code.
Pages or app-level workflows compose them. Each feature and each API service
MUST expose its selected exports through `index.ts`. Code outside the module
MUST import that entrypoint. Code inside the module MUST use relative imports
and MUST NOT import its own `index.ts`. Nuxt auto-imports MUST stay disabled
(`imports.autoImport: false` and `components.dirs: []`). Versioned-route
handlers MUST stay thin. Domain logic MUST live in
`apps/api/server/services/<domain>/`. Cross-domain orchestration MUST live in
`server/workflows/`.

Rationale: public entrypoints and explicit imports are what ESLint and
Steiger can check.

### III. Server authority

Authoritative permissions and business decisions MUST run on the server.
Frontend checks MUST be limited to navigation and presentation. A protected
operation MUST take validated input and an actor established on the server.
`requireActor` establishes authentication only. The resource policy MUST
decide authorization inside the business operation, so a job or another
entrypoint cannot bypass it. Unmatched permissions MUST be denied. Reads
MUST be scoped as well as writes. Ownership, roles, and membership MUST come
from trusted server data.

Rationale: a client check does not protect a resource that another
entrypoint can reach.

### IV. Published contracts

Versioned-route failures, and `/api/auth/*` failures, MUST use the API error
contract: `error`, a safe non-empty `message`, and `details` only for
`invalid_input` when at least one usable input detail exists. Callers MUST
branch on `error`, never on message text. Domain code MUST raise a domain
failure and MUST NOT build the HTTP body. The error adapter MUST translate
that failure. A thrown `ZodError` MUST stay `internal_error`. Responses
MUST NOT include stack traces, SQL, credentials, or internal provider
errors. Health success bodies stay separate; health failures use the API
error contract. Shared request and response schemas MUST live in
`packages/types`. Database rows MUST NOT be sent to the browser. The
database capability seam and bearer session transport MUST follow their
ADRs. An established contract MUST change only through an ADR and a
compatibility assessment. Issues, specs, and tests MUST use the terms in
`CONTEXT.md`.

Rationale: clients and generated docs depend on stable codes. ADRs 0001
through 0004 already record these decisions.

### V. Proven changes

A change to runtime behavior MUST include tests for the new behavior and
for the regressions it can cause. Tests MUST be named `*.spec.ts`. Before
review, run `pnpm lint`, then `pnpm type-check`, then `pnpm test`. Coverage
on `pnpm test:coverage:ci` MUST stay at or above 90% lines, functions,
branches, and statements for the projects that job includes. The default
suite MUST NOT require Docker or another external service. When a test must
prove SQL constraints, rollback, or concurrency, it MUST use a real
database; a mock MUST NOT stand in for those semantics. A change to module
exports, Nuxt configuration, or routing MUST also pass `pnpm build`, because
CI does not run the build. A pull request that changes visible UI MUST
include screenshots.

Rationale: CI enforces lint, types, tests, coverage, commitlint, and Vite
Doctor. Local build and screenshots cover what CI does not run.

## Technology and security constraints

Development and CI MUST use Node.js 22.23.2 or newer on the 22.x line.
Dependencies MUST be installed with the pnpm version pinned in
`package.json`. `@types/node` MUST stay on major 22. Application code MUST
use TypeScript and the Vue Composition API with `<script setup lang="ts">`.
The root `@antfu/eslint-config` is the format: two-space indentation, single
quotes, and no semicolons. Tailwind classes MUST use theme tokens and scale
values, and MUST NOT use duplicate, conflicting, or deprecated classes.

Authentication MUST use Better Auth. Postgres access MUST use Drizzle.
Transactions MUST go through `withTransaction(fn)`. The `Database` type
MUST omit `.transaction()`. Remote client data MUST use the configured
Pinia Colada query cache. Client state shared across screens MUST use
Pinia. Temporary form and dialog state MUST stay local to the screen.
Every environment variable a Nuxt config reads MUST be listed in
`turbo.json` under `build.env`. API startup MUST require `DATABASE_URL`,
`REDIS_URL`, a valid `BETTER_AUTH_URL`, and a `BETTER_AUTH_SECRET` of at
least 32 characters.

A pattern that `docs/backend-patterns.md` marks as future work MUST NOT be
treated as an existing runtime helper. Adopt it only when that guide's
introduce-when condition is met.

## Delivery workflow

Commit messages and pull request titles MUST be Conventional Commits, and
commitlint MUST accept them. A feature pull request into `develop` MUST be
squashed so its title becomes the feature commit. A release candidate MUST
be cut as `release/<candidate>` from `develop`. Promotion into `main`, and
merging release fixes or production hotfixes back into `develop`, MUST use
a merge commit that preserves the individual Conventional Commits.
semantic-release MUST compute the version from those commits. `fix` and
`perf` are a patch, `feat` is a minor, and a `BREAKING CHANGE` is a major.
The repository MUST NOT keep a `CHANGELOG.md` or a committed version bump.
`conventional-changelog-conventionalcommits` MUST stay on 9.3.x until the
release-notes generator can render a newer preset. Dependency updates MUST
arrive as Dependabot pull requests and MUST be reviewed as version changes.
A `chore(deps)` commit MUST NOT be expected to publish a release by itself.

A pull request MUST explain the behavior change, link related issues, and
list the validation that ran. Protected branches MUST require the `verify`,
`vite-doctor`, `coverage`, and `commitlint` checks. Force pushes to those
branches MUST stay blocked. Publishing MUST follow successful CI for the
selected `main` commit. Failed verification or a failed deployment MUST
prevent a new tag or GitHub release.

## Governance

This constitution is the principle source for Spec Kit specs, plans, tasks,
and reviews. Procedures stay in `AGENTS.md`, `docs/architecture.md`,
`docs/backend-patterns.md`, `docs/adr/`, and `CONTEXT.md`. Where informal
practice conflicts with a principle here, this constitution wins. A proposal
that conflicts with an ADR MUST name that ADR. Changing a principle that an
ADR records requires amending both documents in the same change.

An amendment MUST say what changed and why, and MUST bump the version:

- MAJOR: a principle is removed or redefined so existing guidance no longer
  complies.
- MINOR: a principle or section is added, or guidance is materially expanded.
- PATCH: wording, clarification, or another non-semantic fix.

`Last Amended` MUST be the amendment date. `Ratified` stays the original
adoption date. Reviewers MUST check changes against these principles. A new
architectural seam, or an exception to a principle, MUST be written in the
spec or in an ADR. Spec Kit templates read this file at runtime. Editing a
template MUST NOT replace an amendment.

**Version**: 1.0.0 | **Ratified**: 2026-10-04 | **Last Amended**: 2026-10-04
