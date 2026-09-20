# API error contract and the global error adapter

All domain failures render as `{ error, message }` through a single error adapter (`server/error-adapter.ts`), registered via Nitro's `errorHandler`. When `error` is `invalid_input` and there is at least one usable input detail, the body also includes `details: { path, message }[]` (`path` is a string array; `[]` is the whole body). Failures are always JSON. Setting the adapter suppresses Nuxt's built-in HTML error pages, which is correct for an API but surprising if you expect content negotiation.

The error adapter is the last step before that body is sent. It builds the body through `apiError()` in `@nuxt-app/types`, which `safeParse`s as `apiErrorSchema` (`message` non-empty; no max length; no trim; `details` omitted when empty). A domain failure whose override message fails the schema keeps `error` and takes the default safe message for that value; the adapter warns without logging the override text. A bad input detail is dropped the same way. Only if the default message itself is unusable does the client see canned `internal_error`. The adapter reads `DomainFailure` only and does not map `ZodError`. Request validation converts issues to a domain failure at the handler; a thrown `ZodError` (including a failed response `.parse()`) stays `internal_error`. `message` is never joined from details. Unmapped H3 4xx (including 405) map to `not_found`, not `invalid_input`.

## Considered options

- Per-route wrapper (e.g. extending `defineVersionedHandler`): rejected. Every new route would have to remember it, and thrown failures from middleware would bypass it.
- Nuxt's default error handling: rejected. It serializes in Nitro's shape, not the API error contract, and serves HTML to `Accept: text/html`.
- Description-only schema (OpenAPI documents `apiErrorSchema`, adapter still concatenates strings): rejected. The schema and the wire body can drift the day they are written.
- Reclassify a bad override as `internal_error`: rejected. A blank message must not turn absence into an unexpected fault.
- Refuse to construct `DomainFailure` with a bad override: deferred. A useful developer check, not the HTTP invariant.
- Max length or trim on `message`: rejected. A cap becomes a published OpenAPI constraint that does not stop a short leak; trim is a transform, not the contract.
- Details on every code, or always `details: []`: rejected. Input details are field recovery for `invalid_input` only; the key is absent when there is nothing to recover.
- Map thrown `ZodError` in the adapter: rejected. Outbound `.parse()` (hello's response schema) would become `invalid_input` and leak server shape. Handlers attach details on `DomainFailure`.
- Promote or join detail messages into `message`: rejected. `message` is the catch-all; clients that render fields read `details`.
