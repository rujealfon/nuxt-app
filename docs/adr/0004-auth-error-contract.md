# Auth failures use the API error contract

`server/api/auth/[...all].ts` converts Better Auth failures to `DomainFailure`,
which the error adapter renders as `{ error, message, details? }`. The route
also validates the two password flows against shared schemas before calling
`auth.handler()`.

Better Auth, through `better-call`, serializes failures as `{ message, code }`
and drops field issues. The route validates bounded request bytes against
`registerSchema` or `loginSchema` from `@nuxt-app/types`. It throws
`invalidInputFromZod()` for malformed input so the response can include
`details`. That request never reaches Better Auth or the database. Before reading the
body, the adapter charges both password flows to one Redis-backed per-IP
pre-validation budget (100 requests per 60 seconds). This budget follows
`RATE_LIMIT_ENABLED` and denies requests when Redis is unavailable. The
independent Better Auth endpoint limits remain enabled.

For failures after delegation, `authFailureFromResponse(status, body)` maps
Better Auth's `code` first, then falls back to the HTTP status. For example,
`USER_ALREADY_EXISTS*` maps to `conflict` and `FAILED_TO_CREATE_*` maps to
`internal_error`. The latter uses a fixed safe message; other codes keep
Better Auth's user-facing message. The route copies `X-Retry-After` and
`Set-Cookie` from the failed response onto the event before throwing. The
adapter replaces headers but does not clear them.

Every auth request body is limited to 16 KiB of actual bytes before JSON
parsing, including forms, chunked uploads and bodies without Content-Length.
This limit applies even when `RATE_LIMIT_ENABLED=false`. Oversized input returns
`invalid_input` without field details; the adapter stops the upload and closes
the Node connection after sending the error. Accepted bytes are replayed to
Better Auth, preserving form support. The bound applies before route, origin,
or session checks, including unknown auth paths. Bodyless `GET` and `HEAD`
requests do not start an upload reader. Malformed password-flow bodies consume
the shared pre-validation budget; credential guessing also retains Better Auth's
stricter per-endpoint limits.
Only the two password flows return `details`; other auth endpoints have no
shared schema from which to derive field errors.

## Considered options

- Rewriting the Better Auth response without pre-validation: rejected. The serialized body has no field issues, so `invalid_input` could not carry `details`.
- Re-parsing the request body only after a `VALIDATION_ERROR` response: rejected. Equivalent output, but it needs the request clone kept alive across the handler for a case pre-validation already answers.
- An `onAPIError` / `onValidationError` hook: rejected. Better Auth's hook only logs; the router still serializes `{ message, code }`, so the contract cannot be changed from there.
- Leaving Better Auth on its own shape (the previous decision): rejected. Clients had to branch on two error formats, and form recovery for `invalid_input` did not exist on the auth routes.
- Mapping by status alone: rejected. `422` is both `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` (conflict) and `FAILED_TO_CREATE_USER` (a server fault), so the code table is required.
- Surfacing Better Auth's `code` to clients: rejected. The API error contract is the only failure vocabulary clients branch on.
