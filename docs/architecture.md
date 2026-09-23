# Architecture

Use the [Feature-Sliced Design skill](../.agents/skills/feature-sliced-design/SKILL.md)
to decide where frontend code belongs. It adapts
[feature-sliced/skills at fd71da4](https://github.com/feature-sliced/skills/tree/fd71da42a89e916f2ced63e5349fd865c87070a6/feature-sliced-design)
to this Nuxt 4 monorepo. Follow this guide and each app's `AGENTS.md` for paths
and import rules. Keep route files in `app/pages/`. Put substantial screen
behavior in `app/features/` even when one route uses it. Keep peer features
independent and share code through `packages/`. Run `pnpm lint:structure` for
Steiger.

## Organization and ownership

Keep the four Nuxt applications independently deployable. Keep the API as one
application with services grouped by domain. Group substantial frontend
behavior under `app/features/<feature>/`; keep small pages and route metadata
in Nuxt's `app/pages/` directory.

Current examples are `apps/app/app/features/auth` (sign-in and registration),
`apps/admin/app/features/auth` (administrator sign-in), and
`apps/api/server/services/hello` (the greeting operation). Auth transport and
session state live in `packages/client`; validation contracts live in
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
route. Implementation files should import one another by relative path to avoid
cycles through their own `index.ts`.

Nuxt registers pages and middleware by convention. This repository disables
auto-imports (`imports.autoImport: false` and `components.dirs: []`). Import Vue
APIs, Nuxt and shared composables, components, features, and API services
explicitly.

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

Steiger also runs during `pnpm lint` for the frontend app roots. It checks that
feature slices have `index.ts` entrypoints, that `features/` has no layer-level
entrypoint, and that segment folders such as `ui/` sit inside a feature. Run
`pnpm lint:structure` to check these rules on their own. Steiger does not check
the API service structure or replace the ESLint import rules.

The ESLint rules resolve relative imports and the existing Nuxt aliases per workspace,
including static dynamic imports and re-exports. `test/architecture.spec.ts`
checks accepted and rejected dependencies against the actual ESLint config.
Keep that coverage current when adding aliases or changing module conventions.
These rules do not detect every dependency cycle. Review imports within each
module and new dependencies between shared packages.

## Growing a feature

Start with the files the behavior needs. Add `ui/`, `api/`, and `model/`
subdirectories when they contain code. Keep screen
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
[backend patterns](backend-patterns.md). It distinguishes implemented behavior
from guidance for future work and states when to adopt each pattern.

## Verification

Run `pnpm lint`, `pnpm type-check`, and `pnpm test` before review. Architecture
tests run in the `unit` project; auth route tests run in `app` and `admin`, and
API HTTP contracts run in `api`. `pnpm type-check` runs the apps' Nuxt type
checks and then `tsconfig.test.json`, which covers the root `test/**` and
`packages/{config,types,logger}` node tests. Run `pnpm build` after changing
module exports, Nuxt configuration, or routing to verify production bundling.
