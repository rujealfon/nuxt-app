# Auth failures use the API error contract

`server/api/auth/[...all].ts` converts Better Auth failures to `DomainFailure`,
which the error adapter renders as `{ error, message, details? }`. The route
also validates the two password flows against shared schemas before calling
`auth.handler()`.

Better Auth, through `better-call`, serializes failures as `{ message, code }`
and drops field issues. The route validates a clone of the request body against
`registerSchema` or `loginSchema` from `@nuxt-app/types`. It throws
`invalidInputFromZod()` for malformed input so the response can include
`details`. That request never reaches Better Auth, its rate limiter, or the
database.

For failures after delegation, `authFailureFromResponse(status, body)` maps
Better Auth's `code` first, then falls back to the HTTP status. For example,
`USER_ALREADY_EXISTS*` maps to `conflict` and `FAILED_TO_CREATE_*` maps to
`internal_error`. The latter uses a fixed safe message; other codes keep
Better Auth's user-facing message. The route copies `X-Retry-After` and
`Set-Cookie` from the failed response onto the event before throwing. The
adapter replaces headers but does not clear them.

Pre-validation bypasses Better Auth's per-endpoint rate limiter for malformed
bodies. Credential guessing uses well-formed bodies and remains rate limited.
Only the two password flows return `details`; other auth endpoints have no
shared schema from which to derive field errors.

## Considered options

- Rewriting the Better Auth response without pre-validation: rejected. The serialized body has no field issues, so `invalid_input` could not carry `details`.
- Re-parsing the request body only after a `VALIDATION_ERROR` response: rejected. Equivalent output, but it needs the request clone kept alive across the handler for a case pre-validation already answers.
- An `onAPIError` / `onValidationError` hook: rejected. Better Auth's hook only logs; the router still serializes `{ message, code }`, so the contract cannot be changed from there.
- Leaving Better Auth on its own shape (the previous decision): rejected. Clients had to branch on two error formats, and form recovery for `invalid_input` did not exist on the auth routes.
- Mapping by status alone: rejected. `422` is both `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL` (conflict) and `FAILED_TO_CREATE_USER` (a server fault), so the code table is required.
- Surfacing Better Auth's `code` to clients: rejected. The API error contract is the only failure vocabulary clients branch on.
