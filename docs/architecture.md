# Architecture

## Organization and ownership

Keep the four Nuxt applications independently deployable. The API remains a
single application with domain-oriented services. Group substantial frontend
behavior under `app/features/<feature>/`; keep small pages and route metadata
in Nuxt's `app/pages/` directory.

The existing examples are `apps/app/app/features/auth` (sign-in and registration),
`apps/admin/app/features/auth` (administrator sign-in), and
`apps/api/server/services/hello` (the greeting operation). Auth transport and
session state remain in `packages/client`, and validation contracts remain in
`packages/types`.

## Public interfaces and imports

Each feature and service exposes selected exports through `index.ts`. Import
that entrypoint explicitly from outside the module:

```ts
// Frontend route
import { LoginScreen } from '~/features/auth'

// API handler
import { getHelloMessage } from '../../services/hello'
```

Inside the module, use relative imports to implementation files. Keep tests
beside the implementation when they exercise internal behavior; route-level
integration tests can remain in an app's `test/` directory and mount the real
route. Avoid importing a module's own barrel from production implementation
files, which can introduce cycles.

Nuxt registers pages and middleware by convention. Auto-imports are disabled
repo-wide (`imports.autoImport: false` and `components.dirs: []`), so Vue APIs,
Nuxt and shared composables, and components are all imported explicitly. Feature
folders and API services are explicitly imported too, so their private exports
never become application-wide globals.

## Dependency rules

`pnpm lint` enforces these rules through `eslint.architecture.mjs`:

- Consumers access feature and service modules through `index.ts`.
- Features are independent of peer features and application composition code.
  Compose multiple features in pages or app-level workflows.
- API services are independent of peer domains and versioned-route handlers. Put
  cross-domain orchestration in `server/workflows/` when needed. Services may
  use server utilities and database code.
- Applications share code through workspace packages, not direct app imports.
- Shared packages remain independent of applications.
- Frontend code accesses server operations through HTTP and shared contracts.

The rules resolve relative imports and the existing Nuxt aliases per workspace,
including static dynamic imports and re-exports. `test/architecture.spec.ts`
checks accepted and rejected dependencies against the actual ESLint config.
Keep that coverage current when adding aliases or changing module conventions.
These import rules do not provide a general dependency-cycle detector; keep
imports inside each module directional and review new shared-package dependencies.

## Growing a feature

Start with the files the behavior needs. Add `ui/`, `api/`, and `model/`
subdirectories as they become useful; avoid empty scaffolding. Keep screen
behavior in the feature, routing and page metadata in the route, and authoritative
permissions and business decisions on the server.

Use the existing Better Auth client for authentication state. For remote data,
use the configured Pinia Colada query cache; keep temporary form and dialog
state local, and use Pinia for client state shared across screens. Add queries,
mutations, or stores when actual behavior needs them.

Keep shared UI in `packages/ui`, auth and HTTP foundations in `packages/client`,
and shared request/response schemas in `packages/types`. Group growing contracts
by domain and API version without exposing database rows to the browser. Extract
shared domain packages only when multiple apps need the same behavior. Use Nuxt
layers for reusable Nuxt configuration and capabilities; ordinary features do
not need their own layer.

## Backend growth

For protected business operations, API error contracts, persistence,
multi-write transactions, and durable external effects, follow
[Backend Patterns and Growth Plan](backend-patterns.md). It distinguishes current
runtime behavior from implementation conventions and defines adoption triggers
and verification requirements for each pattern.

## Verification

Run `pnpm lint`, `pnpm type-check`, and `pnpm test` before review. Architecture
tests run in the `unit` project; auth route tests run in `app` and `admin`, and
API HTTP contracts run in `api`. `pnpm type-check` runs the apps' Nuxt type
checks and then `tsconfig.test.json`, which covers the root `test/**` and
`packages/{config,types,logger}` node tests. Run `pnpm build` after changing
module exports, Nuxt configuration, or routing to verify production bundling.
