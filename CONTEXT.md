# nuxt-app

A pnpm/Turborepo monorepo of Nuxt applications: a public site, a user SPA, an admin SPA, and a Nitro API that all three consume through shared packages.

## Language

**Product route**:
An HTTP endpoint under a registered API version (`/api/<version>/*`) that serves product behavior.
_Avoid_: public API, business endpoint

**Infra route**:
An unversioned endpoint that supports the platform rather than the product — Better Auth (`/api/auth/*`) and health checks (`/api/health*`). Infra routes keep their own response contracts.
_Avoid_: system endpoint, internal route

**Actor**:
The authenticated identity a request acts as: a user id, email, name, and role. Client and server both derive it from the Better Auth session; the UI and middleware gate on the role.
_Avoid_: user, account, session user

**Product failure**:
A transport-independent failure raised by product code when an operation cannot complete — validation, authentication, authorization, absence, conflict, rate limiting, or an unexpected fault. It names what went wrong, not how to phrase it over HTTP.
_Avoid_: error, exception, API error

**Product error contract**:
The single response shape every product route uses for failures: a stable machine-readable code and a safe human-readable message. Clients branch on the code, never the message.
_Avoid_: error response, error format

**Error adapter**:
The HTTP-facing translation at the edge of the API: it turns a product failure into the product error contract, so that translation never lives in product code.
_Avoid_: error handler, error middleware, error serializer
