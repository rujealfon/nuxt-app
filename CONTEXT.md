# nuxt-app

A pnpm/Turborepo monorepo of Nuxt applications: a public site, a user SPA, an admin SPA, and a Nitro API that all three consume through shared packages.

## Language

**Versioned route**:
An HTTP endpoint under a registered API version (`/api/<version>/*`) that serves application behavior.
_Avoid_: public API, business endpoint, product route

**Infra route**:
An unversioned endpoint that supports the platform rather than application behavior — Better Auth (`/api/auth/*`) and health checks (`/api/health*`). Infra routes keep their own response contracts.
_Avoid_: system endpoint, internal route

**Actor**:
The authenticated identity a request acts as: a user id, email, name, and role. Client and server both derive it from the Better Auth session; the UI and middleware gate on the role.
_Avoid_: user, account, session user

**Domain failure**:
A transport-independent failure raised when an operation cannot complete — validation, authentication, authorization, absence, conflict, rate limiting, or an unexpected fault. It names what went wrong, not how to phrase it over HTTP.
_Avoid_: error, exception, API error, product failure, ProductFailure

**API error contract**:
The single response shape every versioned route uses for failures: a stable machine-readable code, a safe, non-empty human-readable message, and, when the code is `invalid_input`, optional input details. Clients branch on the code, never the message; they use input details only to recover fields. Infra routes (Better Auth, health) keep their own contracts.
_Avoid_: error response, error format, Zod issue, validation error, ProductError

**Input detail**:
A request path and a safe, non-empty message naming one part of the request that failed validation. Present only when the API error code is `invalid_input`; the key is omitted when there are none. An empty path is the whole body.
_Avoid_: Zod issue, field error, validation error

**Error adapter**:
The HTTP-facing translation at the edge of the API: it turns a domain failure into the API error contract, so that translation never lives in domain code.
_Avoid_: error handler, error middleware, error serializer
