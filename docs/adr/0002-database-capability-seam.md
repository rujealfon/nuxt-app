# Database capability seam

Status: Accepted. Superseded in part by [ADR 0006](0006-service-layout-and-injected-database.md).
Date: 2026-09-17

## Context

The original decision covered two drivers. The neon-http driver declared
`.transaction()` but threw at runtime, so transaction support was a capability
that varied by driver, and callers could not tell from the types whether it
worked.

## Decision

Callers use `withTransaction(fn)` on the `DbHandle` seam in `db-core.ts` rather
than reaching for `.transaction()` directly, so transaction support stays a
single replaceable capability.

The type system enforces it. `Database` is `Omit<RawDatabase, 'transaction'>`, where
`RawDatabase` is the full node-postgres Drizzle client. `useDb()`, the `db` on
`DbHandle`, and the `tx` handed to `withTransaction(fn)` are all `Database`, so
`db.transaction(...)` and a nested `tx.transaction(...)` fail to compile. The
only way to open a transaction is `withTransaction(fn)`.

The raw client stays reachable under a different name for the callers that need
it: `DbHandle.rawDb` and `useRawDb()` (`server/utils/db.ts`). Better Auth's
Drizzle adapter (`createAuth(db: RawDatabase, ...)`, wired in `utils/auth.ts`),
`seed.ts`, and `better-auth.config.ts` use it. Nothing else should.
## Consequences

- `db.transaction(...)` and a nested `tx.transaction(...)` fail to compile, and
  `db-core.spec.ts` asserts the types, so `pnpm type-check` fails if the seam
  widens.
- The hiding is type-level only: the runtime object is the same client, so a
  cast can still reach `.transaction()`.
- ADR 0006 records the removal of the neon-http driver: node-postgres is the
  only driver and supports interactive transactions.

## Considered options

- Capability flag (`{ db, transactions }`) for callers to branch on: rejected. Every query caller
  would pay for a need only transactions have.
- Failing at boot on incapable drivers: moot now that the only driver supports transactions.
