# Services return a Result for expected domain failures

Status: Accepted.
Date: 2026-10-15

## Context

ADR 0001 had domain code raise `DomainFailure` and the error adapter render it.
For expected outcomes (invalid input, a conflict, a rate limit) that hid the
failure from the function signature: a caller could not see from the types that
`handleAuthRequest` or `readAuthBody` might fail, and tests asserted on
rejections instead of values. Unexpected faults (a database outage, a bug) are
a different case and already map to `internal_error` without domain code
choosing a status.

## Decision

`server/utils/result.ts` defines a zero-dependency
`Result<T, E = Failure> = Ok<T> | Err<E>` with `ok(value)`, `err(error)` and
`unwrapOrThrow(result)`. A `Failure` is plain data
(`{ error, message, details? }`) built with `failure(code, message?, details?)`
from `server/utils/domain-failure.ts`; `invalidInputFromZod` and
`authFailureFromResponse` return one.

Service operations in `server/services/**` return `Result` for expected
failures and throw only for unexpected ones. The route handler is the HTTP edge:
it calls `unwrapOrThrow`, which throws the failure as a `DomainFailure`, and the
error adapter renders the API error contract exactly as before. Headers a
service sets on the event before returning `err` (retry hints, cookies) still
reach the response.

`defineResultHandler(fn)` in `server/utils/result-handler.ts` wraps
`defineEventHandler` for a route whose operation returns `Result<T>` (or a
promise of one): it runs `fn(event)` and applies `unwrapOrThrow`, so the unwrap
cannot be forgotten. The auth catch-all uses it.

`defineVersionedHandler(version, fn)` accepts a handler that returns either a
plain body or a `Result<T>`, sync or async, and unwraps it itself: `ok` sends
its value, `err` throws the failure through `unwrapOrThrow`, and the error adapter
renders the contract. The version (and deprecation) headers are set before the
handler runs, so they stay on a failure response. The route's body type is the
unwrapped `T` for both kinds of handler. Plain bodies behave as before.

ESLint (`handlerFactoryGuard` in `eslint.architecture.mjs`) enforces this in
`apps/*/server/api/**/*.ts`, specs excepted: importing `defineEventHandler`,
`eventHandler`, or their lazy or cached variants from `h3` or `nitropack/runtime`
(including namespace imports, re-exports, and dynamic imports) is an error, so a
route cannot be written without one of the two wrappers. Seven unversioned
infra routes are exempt by exact path (`handlerFactoryExemption`). None
calls a `Result`-returning service; each answers with its own body or throws the
not-found failure, and converting them would change responses or add version
headers:
`health.get.ts`, `health/ready.get.ts`, `index.get.ts` (version registry),
`openapi.json.get.ts`, `docs.get.ts`, `docs-assets/standalone.js.get.ts`, and the
`[...slug].ts` catch-all. Do not add a route that calls a service to that list.

Two safeguards keep a Result out of a response body. At run time, `ok()` and `err()` mark
their objects with a non-enumerable symbol property, and `isResult(value)` checks it. A
look-alike body such as `{ ok: true, value }` is not a Result, and the mark never appears
in serialisation, spreads, or equality checks. `defineVersionedHandler` and
`defineResultHandler` pass the final unwrapped value through `assertNotResult`, which
walks the value, its plain-object properties and its array elements down to
`resultScanDepth` (4 levels below the body) and throws a plain `Error` naming the path
when it finds a Result. So `ok(ok(x))`, `ok(err(...))` and `{ data: ok(x) }` fail instead
of serialising. The walk skips anything that is not a plain object or array (`Response`,
streams, `Date`, typed arrays, class instances, `Map`, `Set`), so it never reads or
consumes those, and it is cycle-safe. The error adapter logs the error and answers
`internal_error`, so a raw Result is never serialised. Responses of existing routes are
unchanged.

At compile time, `ValidResult<R>` (used as `R extends ValidResult<R>` by both wrappers)
also requires that the response body, an `Ok`'s value or a plain body, contains no
`Result`. `NoNestedResult<T>` resolves to `never` when `T`, or a property, array element,
tuple member or union member of `T` to the same depth of 4, is an `Ok` or `Err` (matched by
the type-level brand), so `defineVersionedHandler('v1', () => ({ data: ok(1) }))` and
`defineResultHandler(async () => ok(ok(1)))` do not compile. Primitives, functions and the
same built-in objects the runtime walk skips, `any` and `unknown` are never descended
into. Both checks stop at depth 4: a Result buried deeper is caught by neither, and the
runtime walk cannot see inside a class instance that the type check does walk.

The `DomainFailure` class remains where code must throw at the h3 boundary:
middleware (rate limit, docs guard, API-only), `requireActor`, the unknown-route
and docs-asset routes, and the `unwrapOrThrow` edge. The `ZodError` rule is
unchanged: an unhandled `ZodError` is `internal_error`, and handlers convert
parse failures with `invalidInputFromZod`.

## Consequences

- The signatures of `handleAuthRequest`, `readAuthBody` and
  `validateAuthRequest` show that they can fail, and the compiler requires the
  caller to handle `err`.
- Response bodies, statuses, headers and OpenAPI are unchanged; the error
  adapter and its tests are unchanged.
- A service that returns `Result` must be unwrapped by every entrypoint (route,
  job, workflow). The compile-time and run-time checks keep a forgotten unwrap, at the top
  level or inside a body, from reaching a client (see Decision); new routes still need an
  HTTP test of the failure path.
- This supersedes the part of ADR 0001 and ADR 0004 that has services and the auth route throw
  `DomainFailure`. The adapter's contract, status table and `ZodError` decision stand.

## Considered options

- Keep throwing `DomainFailure` from services: rejected. Expected failures stay invisible to the
  types.
- A Result library (e.g. neverthrow): rejected. The three helpers above are all the code uses, so a
  dependency adds no value.
- Convert middleware and session guards too: rejected. They run inside h3, where throwing is the
  mechanism, so a Result would be unwrapped immediately.
- Keep the explicit `unwrapOrThrow` call in versioned handlers: rejected. The unwrap
  was easy to forget (the brand only turned a miss into `internal_error` at run
  time), and `defineVersionedHandler` already is the HTTP edge for those routes.
- Lint only the runtime brand check: rejected. A forgotten unwrap would still be found
  only when the route runs; the lint rule fails it at review time.
- Convert the infra routes to the wrappers: rejected. They return no
  `Result`, and `defineVersionedHandler` would add version headers to unversioned
  routes.
- Detect a Result by shape (`ok` plus `value` or `error`): rejected. It would collide with
  legitimate bodies; the symbol brand cannot.
