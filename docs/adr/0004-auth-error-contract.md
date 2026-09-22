# Auth failures use the API error contract

`/api/auth/*` no longer leaks Better Auth's error shape. `server/api/auth/[...all].ts` sits between the event and `auth.handler()`: it re-validates the two documented password flows against the shared schemas, and translates every failing response into a `DomainFailure`, so the error adapter renders the same `{ error, message, details? }` body as every other route.

Better Auth (via `better-call`) answers failures with `{ message, code }` and drops the field issues when it serializes. Response rewriting alone can produce `error` and `message`, but never `details` — the issues are gone before the response exists. So the route pre-parses a clone of the request body against `registerSchema` / `loginSchema` (`@nuxt-app/types`) and throws `invalidInputFromZod()` before delegating. A body that fails there never reaches Better Auth, its rate limiter, or the database.

For everything after delegation, `authFailureFromResponse(status, body)` maps Better Auth's `code` first (for the meanings the HTTP status does not imply, such as `USER_ALREADY_EXISTS*` → `conflict` and `FAILED_TO_CREATE_*` → `internal_error`), then falls back to the status. `internal_error` uses the canned message so a 5xx body cannot name internal failures; every other code keeps Better Auth's safe, user-facing message. `X-Retry-After` and `Set-Cookie` from the failing response are copied onto the event before throwing, because the adapter replaces headers but does not clear them.

Two boundaries are deliberate. Pre-validation skips Better Auth's per-endpoint rate limiter for malformed bodies, but credential guessing sends well-formed bodies and stays throttled. `details` exists only for the two password flows; other auth endpoints answer the contract without them, because there is no shared schema to derive field errors from.

## Considered options

- Rewriting the Better Auth response in the route without pre-validation: rejected. The body has no issues, so `invalid_input` could never carry `details` — the whole point of the change.
- Re-parsing the request body only after a `VALIDATION_ERROR` response: rejected. Equivalent output, but it needs the request clone kept alive across the handler for a case pre-validation already answers.
- An `onAPIError` / `onValidationError` hook: rejected. Better Auth's hook only logs; the router still serializes `{ message, code }`, so the contract cannot be changed from there.
- Leaving Better Auth on its own shape (the previous decision): rejected. Clients had to branch on two error formats, and form recovery for `invalid_input` did not exist on the auth routes.
- Mapping by status alone: rejected. `422` is both `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` (conflict) and `FAILED_TO_CREATE_USER` (a server fault), so the code table is required.
- Surfacing Better Auth's `code` to clients: rejected. The API error contract is the only failure vocabulary clients branch on.
