# Product error contract and the global error adapter

All product failures render as `{ error, message }` through a single Nitro error handler (`server/error.ts`), registered via `nitro.errorHandler`. Errors are JSON-always: setting the handler suppresses Nuxt's built-in HTML error pages, which is correct for an API but surprising if you expect content negotiation.

## Considered Options

- Per-route wrapper (e.g. extending `defineVersionedHandler`): rejected — every new route would have to remember it, and thrown failures from middleware would bypass it.
- Nuxt's default error handling: rejected — it serializes in Nitro's shape, not the product contract, and serves HTML to `Accept: text/html`.
