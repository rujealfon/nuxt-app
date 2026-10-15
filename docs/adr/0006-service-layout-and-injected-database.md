# Service layout and injected database

Status: Accepted.
Date: 2026-10-15

## Context

`server/services/<domain>/` is the home of business logic, but nothing said how
a domain's files are arranged. ADR 0002 put `useDb()` and `withTransaction` in
`server/utils/db.ts` and gave pure types to `db-core.ts`. A service that imports
`useDb()` is bound to the Nitro runtime, which makes it hard to test with a
test database or to call from a job or workflow.

## Decision

Arrange a service by responsibility, creating each part only when it exists:

- `commands/<verb-noun>.ts`: use cases (policy check, rules, transaction,
  persistence) that return `Result` (ADR 0005).
- `queries/<get-thing>.ts`: Drizzle reads that return the contract shape.
- `domain/<thing>-rules.ts`: pure functions, status unions, and transitions.
- `<thing>-policy.ts`, a private `<thing>-repository.ts`, `ports.ts` for small
  vendor interfaces, and colocated `*.spec.ts`.
- `index.ts` exports only public commands and queries.

The existing boundary rule already allows these subfolders: the `service`
element is `services/*`, so nested files belong to their service. Inside a
service, a file imports another file in the same folder with `./x` and a file in
a sibling folder with the `#server` alias, for example `commands/invite-member.ts`
importing `#server/services/invitations/domain/invitation-rules`; the
`parentRelative` rule rejects `../domain/...`. Outside the service, code imports
only through `index.ts`. Inside the service, import files directly rather than
through its own `index.ts`, so the entrypoint does not create a cycle.
`test/architecture.spec.ts` covers both forms.

Services receive `db` or a transaction handle as an argument. Under
`apps/*/server/services/**`, ESLint (`serviceDatabaseGuard`) rejects static,
dynamic, and re-export imports of:

- `#server/utils/db` (`useDb`, `withTransaction`);
- `nitropack/runtime`, `#imports`, `pg`, and `drizzle-orm/node-postgres`, so a service cannot
  read runtime config or open a connection itself;
- `createDb` (and namespace or `export *` access to it) from
  `#server/utils/db-core`.

Type-only imports stay allowed: `import type`, inline `type` specifiers, and
types from `#server/utils/db-core` such as `Database`. Route handlers or
workflows wire `useDb()` and `withTransaction` and pass the handle down. A
`Database` has no `.transaction()` (ADR 0002); services take `Database`, not
`RawDatabase`, which is for Better Auth's adapter and the CLI scripts.

There are no exemptions. A service that needs runtime configuration receives it
as an argument: the auth catch-all route passes `useRuntimeConfig(event)` to
`handleAuthRequest(event, config)`, which declares the fields it reads as
`AuthRequestConfig`.

## Consequences

- Service tests pass a test database or transaction instead of mocking a module.
- A command that needs a transaction takes the handle from its caller, so the
  caller owns the transaction boundary (ADR 0002).
- Existing services (`hello`, `auth`) have no persistence and are not
  restructured.
- node-postgres (`pg`) is the only database driver. The neon-http driver and
  `DATABASE_DRIVER` selection from ADR 0002 are removed, so every `Database` supports
  interactive transactions through `withTransaction`.
- The rule matches module specifiers, so it cannot see a database obtained
  through a value passed in, a global, or a module the list does not name.
