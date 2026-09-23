# API error contract and the global error adapter

Nitro's `errorHandler` uses `server/error-adapter.ts` to render domain failures as
JSON `{ error, message }`. For `invalid_input`, the response also includes
`details: { path, message }[]` when it has at least one usable detail. `path` is
a string array; `[]` names the whole body. This handler also replaces Nuxt's
built-in HTML error pages, regardless of the request's `Accept` header.

The adapter builds the body with `apiError()` from `@nuxt-app/types`, which
checks it against `apiErrorSchema`. The schema requires a non-empty `message`,
sets no maximum length, does not trim, and omits empty `details`. If an override
message fails the schema, the adapter keeps `error`, uses that code's default
safe message, and warns without logging the override text. It drops an invalid
input detail. Only an unusable default message becomes `internal_error`.

The adapter reads `DomainFailure`, not `ZodError`. Handlers convert request
validation issues to domain failures. A thrown `ZodError`, including one from
response `.parse()`, becomes `internal_error`. Detail messages never become the
general `message`. Unmapped H3 4xx errors, including 405, become `not_found`.

## Considered options

- Per-route wrapper (e.g. extending `defineVersionedHandler`): rejected. Every new route would have to remember it, and thrown failures from middleware would bypass it.
- Nuxt's default error handling: rejected. It serializes in Nitro's shape, not the API error contract, and serves HTML to `Accept: text/html`.
- Description-only schema (OpenAPI documents `apiErrorSchema`, adapter still concatenates strings): rejected. The schema and the response could disagree immediately.
- Reclassify a bad override as `internal_error`: rejected. A blank message must not turn absence into an unexpected fault.
- Refuse to construct `DomainFailure` with a bad override: deferred. The response still needs validation at the adapter.
- Max length or trim on `message`: rejected. A cap becomes a published OpenAPI constraint that does not stop a short leak; trim is a transform, not the contract.
- Details on every code, or always `details: []`: rejected. Input details are field recovery for `invalid_input` only; the key is absent when there is nothing to recover.
- Map thrown `ZodError` in the adapter: rejected. Outbound `.parse()` (hello's response schema) would become `invalid_input` and leak server shape. Handlers attach details on `DomainFailure`.
- Promote or join detail messages into `message`: rejected. `message` is the catch-all; clients that render fields read `details`.
