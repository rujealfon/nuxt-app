# nuxt-app

A pnpm/Turborepo monorepo of Nuxt applications: a public site, a user SPA, an admin SPA, and a Nitro API that all three consume through shared packages.

## Language

**Versioned route**:
An HTTP endpoint under a registered API version (`/api/<version>/*`) that serves application behavior.
_Avoid_: public API, business endpoint, product route, product endpoint, product API, domain endpoint

**Infra route**:
An unversioned endpoint that supports the platform rather than application behavior: Better Auth (`/api/auth/*`), health (`/api/health*`), the version registry (`GET /api`), and API docs (`/api/docs*`, `/api/openapi.json`).
_Avoid_: system endpoint, internal route, infrastructure route

**Actor**:
The authenticated identity a request acts as: a user id, email, name, and role. Client and server both derive it from the Better Auth session; the UI and middleware gate on the role.
_Avoid_: user, account, session user

**Domain failure**:
A failure independent of transport. Domain code raises it when an operation cannot complete: validation, authentication, authorization, absence, conflict, rate limiting, or an unexpected fault. It describes what went wrong, not how to phrase it in HTTP.
_Avoid_: error, exception, API error, product failure, ProductFailure

**API error contract**:
The single failure shape for versioned routes: `error` (a stable code), a safe non-empty message, and optional input details only on `invalid_input`. Clients branch on `error`, never the message. Better Auth keeps its own contract. Health 200s are custom liveness/readiness bodies; health failures and other infra-route failures use this shape.
_Avoid_: error response, error format, Zod issue, validation error, ProductError

**Input detail**:
A request path and a safe, non-empty message naming one part of the request that failed validation. Present only when the API error code is `invalid_input`; the key is omitted when there are none. An empty path is the whole body.
_Avoid_: Zod issue, field error, validation error

**Error adapter**:
The HTTP-facing translation at the edge of the API. It turns a domain failure into the API error contract, so domain code never does that translation.
_Avoid_: error handler, error middleware, error serializer
