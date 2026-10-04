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
MUST NOT include stack traces, SQL, or internal provider errors. Session
credentials MAY be issued only by successful authentication responses
following ADR 0003. Other credentials MUST NOT be exposed, and failure
bodies MUST NOT carry credentials. Health success bodies stay separate;
health failures use the API error contract. Shared request and response schemas MUST live in
`packages/types`. Database rows MUST NOT be sent to the browser. The
database capability seam and bearer session transport MUST follow their
ADRs. An established contract MUST change only through an ADR and a
compatibility assessment. Issues, specs, and tests MUST use the terms in
Language.

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

Better Auth MUST own authentication and session state. Bearer session-token
persistence MUST use the `AuthTokenStore` interface following ADR 0003.
Other remote application data MUST use the configured Pinia Colada query
cache. Shared application UI state outside authentication MUST use Pinia.
Temporary form and dialog state MUST stay local to the screen.
Postgres access MUST use Drizzle. Transactions MUST go through
`withTransaction(fn)`. The `Database` type MUST omit `.transaction()`.
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

## Language

Issues, specs, tests, and names in code MUST use these terms. Before adding
a term, check the code for the project's existing name.

### Versioned route

An HTTP endpoint under a registered API version (`/api/<version>/*`) that
serves application behavior.

Rejected names: public API, business endpoint, product route, product
endpoint, product API, domain endpoint.

### Infra route

An unversioned endpoint that supports the platform rather than application
behavior. Examples are Better Auth (`/api/auth/*`), health (`/api/health*`),
the version registry (`GET /api`), and API docs (`/api/docs*`,
`/api/openapi.json`).

Rejected names: system endpoint, internal route, infrastructure route.

### Actor

The authenticated identity a request acts as, with a user id, email, name,
and role. Client and server derive it from the Better Auth session. The UI
and middleware check the role.

Rejected names: user, account, session user.

### Session transport

How a client carries its session to the API. Browser apps use a session
cookie. A WebView that refuses cross-origin cookies can send the opaque
session token in an `Authorization: Bearer` header. Each app selects the
transport through `sessionTransport`. Cookie session transport is the
default. With `AUTH_BEARER_ENABLED=true`, the API registers the bearer
plugin and authentication accepts either cookie or bearer session
transport. With bearer authentication disabled, it accepts cookies only.

Rejected names: auth mode, token type, credential transport, cookie mode,
bearer mode.

### Domain failure

A failure independent of transport. Domain code raises it when an operation
cannot complete because of invalid input, authentication, authorization,
absence, conflict, rate limiting, or an unexpected fault. It describes the
failure without defining its HTTP response.

Rejected names: error, exception, API error, product failure, ProductFailure.

### API error contract

The failure response has `error` (a stable code), a safe non-empty message,
and optional input details on `invalid_input`. Clients branch on `error`,
never the message. `/api/auth/*` converts Better Auth failures to this
shape. Health success responses have separate bodies. Health failures and
other infra-route failures use the API error contract.

Rejected names: error response, error format, Zod issue, validation error,
ProductError.

### Input detail

A request path and a safe, non-empty message naming the invalid input.
Present only for `invalid_input`. Omit the key when there are no details.
An empty path names the whole body.

Rejected names: Zod issue, field error, validation error.

### Error adapter

The HTTP translation at the API boundary. It turns a domain failure into
the API error contract, so domain code does not construct the response.

Rejected names: error handler, error middleware, error serializer.

## Governance

This constitution is the principle source for Spec Kit specs, plans, tasks,
and reviews. Procedures stay in `AGENTS.md`, `docs/architecture.md`,
`docs/backend-patterns.md`, and `docs/adr/`. Where informal
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

**Version**: 1.1.1 | **Ratified**: 2026-10-04 | **Last Amended**: 2026-10-04
