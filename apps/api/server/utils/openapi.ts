import type { ApiVersion } from '@nuxt-app/config'
import { apiVersions, currentApiVersion, versionMeta } from '@nuxt-app/config'
import { apiErrorSchema, loginSchema, registerSchema, v1 } from '@nuxt-app/types'
import { z } from 'zod'
import { deprecationHeaders } from './deprecation'
import { healthResponseSchema, readyResponseSchema, versionRegistrySchema } from './infra'

function toJsonSchema(schema: z.ZodType) {
  const { $schema: _, ...json } = z.toJSONSchema(schema)
  return json
}

const openApiDocumentSchema = z.looseObject({
  openapi: z.string(),
})

function apiErrorResponse(description = 'API error contract. Clients branch on `error`, not message text.'): OpenApiResponse {
  return {
    description,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiError' },
      },
    },
  }
}

function jsonRef(schemaName: string, description: string, headers?: OpenApiResponse['headers']): OpenApiResponse {
  return {
    description,
    ...(headers ? { headers } : {}),
    content: {
      'application/json': {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  }
}

interface OpenApiResponse {
  description: string
  headers?: Record<string, { description: string, schema: unknown }>
  content?: Record<string, { schema: unknown }>
}

interface OpenApiRequestBody {
  required?: boolean
  content: Record<string, { schema: unknown }>
}

interface OpenApiOperation {
  tags: string[]
  summary: string
  description?: string
  security?: Array<Record<string, string[]>>
  requestBody?: OpenApiRequestBody
  responses: Record<string, OpenApiResponse>
}

type OpenApiPathItem = Partial<Record<'get' | 'put' | 'post' | 'delete' | 'patch' | 'options' | 'head', OpenApiOperation>>

const operationsByVersion: Record<ApiVersion, readonly v1.VersionedOperation[]> = {
  v1: v1.operations,
}

// The credentials a protected operation accepts. Better Auth sets an HttpOnly
// session cookie; deployments that enable the bearer plugin also accept the
// opaque session token as `Authorization: Bearer <token>` (ADR 0003). Both are
// alternatives, so a client authenticates with either one.
function authenticatedSecurity(): Array<Record<string, string[]>> {
  return [{ sessionCookie: [] }, { bearerAuth: [] }]
}

function securitySchemes() {
  return {
    sessionCookie: {
      type: 'apiKey',
      in: 'cookie',
      name: 'better-auth.session_token',
      description: 'Better Auth session cookie, set by `/api/auth/*` and HttpOnly. HTTPS deployments prefix it with `__Secure-`. Paste the cookie value to authenticate try-it requests.',
    },
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      description: 'Opaque session token in an `Authorization: Bearer <token>` header. Only available when the deployment enables bearer transport (`AUTH_BEARER_ENABLED=true`).',
    },
  }
}

// Better Auth owns these shapes and answers failures with its own error body,
// not the API error contract. They are documented loosely and only for the
// sign-in flow: Scalar sends them same-origin, so a successful sign-in stores
// the session cookie for later try-it requests. Better Auth internals are not
// frozen here.
const authUserSchema = z.looseObject({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
})

const authSessionSchema = z.looseObject({
  id: z.string(),
  token: z.string(),
  userId: z.string(),
  expiresAt: z.string(),
})

const authSignInResponseSchema = z.looseObject({
  redirect: z.boolean(),
  token: z.string(),
  url: z.string().nullable().optional(),
  user: authUserSchema,
})

const authSignUpResponseSchema = z.looseObject({
  token: z.string().nullable(),
  user: authUserSchema,
})

// `GET /api/auth/get-session` answers `null` (200) when no session is present.
const authSessionResponseSchema = z.union([
  z.looseObject({ session: authSessionSchema, user: authUserSchema }),
  z.null(),
])

const authSignOutRequestSchema = z.looseObject({
  callbackURL: z.string().optional(),
  disableRedirect: z.boolean().optional(),
  state: z.string().optional(),
})

// Better Auth answers `{ success, url?, redirect? }`; `url`/`redirect` only for
// provider (RP-initiated) logout.
const authSignOutResponseSchema = z.looseObject({
  success: z.boolean(),
  url: z.string().optional(),
  redirect: z.boolean().optional(),
})

function authRequestBody(schemaName: string): OpenApiRequestBody {
  return {
    required: true,
    content: {
      'application/json': {
        schema: { $ref: `#/components/schemas/${schemaName}` },
      },
    },
  }
}

// Better Auth routes are unversioned, so they are documented here rather than
// in a `vN.operations` table. Only the email/password flow is covered: it is
// what a local Scalar session needs. Social, OTP, and verification routes stay
// out. Every response is the same-origin browser storing `better-auth.session_token`.
// Failures are normalized onto the API error contract by `server/api/auth/[...all].ts`;
// `invalid_input` may carry `details`, so try-it shows per-field errors.
function authPaths(): Record<string, OpenApiPathItem> {
  return {
    '/api/auth/sign-in/email': {
      post: {
        tags: ['auth'],
        summary: 'Sign in with email and password',
        description: 'Better Auth email/password sign-in. Success sets the `better-auth.session_token` cookie, which the browser stores for later try-it requests on this origin.',
        requestBody: authRequestBody('LoginCredentials'),
        responses: {
          200: jsonRef('AuthSignInResponse', 'Signed in; session cookie set.'),
          default: apiErrorResponse(),
        },
      },
    },
    '/api/auth/sign-up/email': {
      post: {
        tags: ['auth'],
        summary: 'Register with email and password',
        description: 'Better Auth email/password registration. Success signs the new user in and sets the session cookie. A body that fails the shared `RegisterCredentials` schema answers `invalid_input` with `details`.',
        requestBody: authRequestBody('RegisterCredentials'),
        responses: {
          200: jsonRef('AuthSignUpResponse', 'Registered and signed in; session cookie set.'),
          default: apiErrorResponse(),
        },
      },
    },
    '/api/auth/get-session': {
      get: {
        tags: ['auth'],
        summary: 'Current session',
        description: 'Returns the active session and user, or `null` when signed out. Useful to confirm a Scalar sign-in took effect.',
        responses: {
          200: jsonRef('AuthSessionResponse', 'Active session, or `null` when signed out.'),
          default: apiErrorResponse(),
        },
      },
    },
    '/api/auth/sign-out': {
      post: {
        tags: ['auth'],
        summary: 'Sign out',
        description: 'Clears the session and the session cookie. Better Auth requires a JSON `Content-Type`, so an empty object body (`{}`) is sent; all fields are optional.',
        requestBody: authRequestBody('AuthSignOutRequest'),
        responses: {
          200: jsonRef('AuthSignOutResponse', 'Signed out; session cookie cleared.'),
          default: apiErrorResponse(),
        },
      },
    },
  }
}

// Every versioned response advertises its version (mirroring
// `defineVersionedHandler`). Deprecation headers share `deprecationHeaders`.
function versionResponseHeaders(version: ApiVersion) {
  const headers: Record<string, { description: string, schema: ReturnType<typeof toJsonSchema> }> = {
    'x-api-version': {
      description: 'API version that served the response.',
      schema: toJsonSchema(z.enum([version])),
    },
  }

  const meta = versionMeta(version)

  for (const [name] of deprecationHeaders(meta)) {
    if (name === 'deprecation') {
      headers.deprecation = {
        description: 'Present and `true` once the version is deprecated.',
        schema: toJsonSchema(z.enum(['true'])),
      }
    }

    if (name === 'sunset') {
      headers.sunset = {
        description: 'Date after which the version may be removed.',
        schema: { ...toJsonSchema(z.string()), example: meta.sunset },
      }
    }
  }

  return headers
}

// Pure: takes the operation tables so specs can exercise authenticated
// operations without a live protected route.
export function buildVersionedPaths(
  operations: Record<ApiVersion, readonly v1.VersionedOperation[]> = operationsByVersion,
): Record<string, OpenApiPathItem> {
  return Object.fromEntries(
    apiVersions.flatMap(version =>
      operations[version].map(operation => [
        `/api/${version}${operation.suffix}`,
        {
          [operation.method]: {
            tags: [version],
            summary: operation.summary,
            ...(operation.description ? { description: operation.description } : {}),
            ...(operation.authenticated ? { security: authenticatedSecurity() } : {}),
            responses: {
              200: jsonRef(operation.responseName, 'Success.', versionResponseHeaders(version)),
              ...(operation.authenticated ? { 401: apiErrorResponse('No valid session.') } : {}),
              default: apiErrorResponse(),
            },
          },
        } satisfies OpenApiPathItem,
      ]),
    ),
  )
}

function versionedComponentSchemas(): Record<string, ReturnType<typeof toJsonSchema>> {
  return Object.fromEntries(
    apiVersions.flatMap(version =>
      operationsByVersion[version].map(operation => [
        operation.responseName,
        toJsonSchema(operation.responseSchema),
      ]),
    ),
  )
}

// Builds the document Scalar renders. Pure: routes serve the return value as
// JSON, specs import it without touching shared state. Component schemas come
// from the same Zod contracts the handlers parse.
export function buildOpenApiDocument() {
  const paths: Record<string, OpenApiPathItem> = {
    '/api': {
      get: {
        tags: ['meta'],
        summary: 'Version registry',
        description: 'Reports the current version and per-version deprecation metadata.',
        responses: {
          200: jsonRef('VersionRegistry', 'Version registry.'),
          default: apiErrorResponse(),
        },
      },
    },
    '/api/openapi.json': {
      get: {
        tags: ['meta'],
        summary: 'OpenAPI document',
        description: 'This document. Rendered by the Scalar UI at `/api/docs`.',
        responses: {
          200: {
            description: 'OpenAPI 3.1 document.',
            content: { 'application/json': { schema: toJsonSchema(openApiDocumentSchema) } },
          },
          default: apiErrorResponse(),
        },
      },
    },
    ...buildVersionedPaths(),
    ...authPaths(),
    '/api/health': {
      get: {
        tags: ['infra'],
        summary: 'Liveness check',
        responses: {
          200: jsonRef('HealthResponse', 'Service status.'),
          default: apiErrorResponse(),
        },
      },
    },
    '/api/health/ready': {
      get: {
        tags: ['infra'],
        summary: 'Readiness check',
        description: 'Probes PostgreSQL and Redis.',
        responses: {
          200: jsonRef('ReadyResponse', 'Dependency checks.'),
          default: apiErrorResponse(),
        },
      },
    },
  }

  const schemas: Record<string, ReturnType<typeof toJsonSchema>> = {
    ...versionedComponentSchemas(),
    ApiError: toJsonSchema(apiErrorSchema),
    HealthResponse: toJsonSchema(healthResponseSchema),
    ReadyResponse: toJsonSchema(readyResponseSchema),
    VersionRegistry: toJsonSchema(versionRegistrySchema),
    LoginCredentials: toJsonSchema(loginSchema),
    RegisterCredentials: toJsonSchema(registerSchema),
    AuthSignInResponse: toJsonSchema(authSignInResponseSchema),
    AuthSignUpResponse: toJsonSchema(authSignUpResponseSchema),
    AuthSessionResponse: toJsonSchema(authSessionResponseSchema),
    AuthSignOutRequest: toJsonSchema(authSignOutRequestSchema),
    AuthSignOutResponse: toJsonSchema(authSignOutResponseSchema),
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'nuxt-app API',
      version: currentApiVersion,
      description: 'Versioned routes live under `/api/<version>/` and advertise it via `X-Api-Version`. Infra routes (`/api/auth/*`, `/api/health*`, `GET /api`, `/api/docs*`, `/api/openapi.json`) are unversioned. Failures use the API error contract: `/api/auth/*` normalizes Better Auth failures onto it, and `invalid_input` may carry `details`. Health 200s are custom liveness/readiness bodies; health failures use the API error contract. Protected operations accept either the Better Auth session cookie or, on deployments that enable it, a bearer token. The `auth` tag documents the email/password sign-in flow so a local Scalar session can authenticate before calling protected routes.',
    },
    servers: [
      { url: '/', description: 'Same origin: docs, spec, and API share one host.' },
    ],
    tags: [
      { name: 'meta', description: 'Version registry and API documentation.' },
      ...apiVersions.map(version => ({ name: version, description: `Versioned-route operations (${versionMeta(version).deprecated ? 'deprecated' : 'current'}).` })),
      { name: 'auth', description: 'Better Auth email/password sign-in, sign-up, session, and sign-out. Same-origin try-it stores the session cookie. Failures use the API error contract.' },
      { name: 'infra', description: 'Unversioned health checks.' },
    ],
    paths,
    components: {
      securitySchemes: securitySchemes(),
      schemas,
    },
  }
}
