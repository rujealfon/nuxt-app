# nuxt-app

This pnpm/Turborepo monorepo has a public site, a user SPA, an admin SPA, and a Nitro API. The apps share workspace packages.

## Language

### Versioned route

An HTTP endpoint under a registered API version (`/api/<version>/*`) that serves
application behavior.

Avoid: public API, business endpoint, product route, product endpoint, product API, domain endpoint

### Infra route

An unversioned endpoint that supports the platform rather than application
behavior. Examples are Better Auth (`/api/auth/*`), health (`/api/health*`), the
version registry (`GET /api`), and API docs (`/api/docs*`, `/api/openapi.json`).

Avoid: system endpoint, internal route, infrastructure route

### Actor

The authenticated identity a request acts as, with a user id, email, name, and
role. Client and server derive it from the Better Auth session. The UI and
middleware check the role.

Avoid: user, account, session user

### Session transport

How a client carries its session to the API. Browser apps use a session cookie.
A WebView that refuses cross-origin cookies can send the opaque session token in
an `Authorization: Bearer` header. Each app selects the transport through
`sessionTransport`. The API accepts both on every route, but registers the
bearer plugin only when `AUTH_BEARER_ENABLED` is set.

Avoid: auth mode, token type, credential transport, cookie mode, bearer mode

### Domain failure

A failure independent of transport. Domain code raises it when an operation
cannot complete because of invalid input, authentication, authorization,
absence, conflict, rate limiting, or an unexpected fault. It describes the
failure without defining its HTTP response.

Avoid: error, exception, API error, product failure, ProductFailure

### API error contract

The failure response has `error` (a stable code), a safe non-empty message, and
optional input details on `invalid_input`. Clients branch on `error`, never the
message. `/api/auth/*` converts Better Auth failures to this shape. Health
success responses have separate bodies; health failures and other infra-route
failures use the API error contract.

Avoid: error response, error format, Zod issue, validation error, ProductError

### Input detail

A request path and a safe, non-empty message naming the invalid input. Present
only for `invalid_input`. Omit the key when there are no details. An empty path
names the whole body.

Avoid: Zod issue, field error, validation error

### Error adapter

The HTTP translation at the API boundary. It turns a domain failure into the
API error contract, so domain code does not construct the response.

Avoid: error handler, error middleware, error serializer
