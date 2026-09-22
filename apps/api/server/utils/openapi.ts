import type { ApiVersion } from '@nuxt-app/config'
import { apiVersions, currentApiVersion, versionMeta } from '@nuxt-app/config'
import { apiErrorSchema, v1 } from '@nuxt-app/types'
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

interface OpenApiOperation {
  tags: string[]
  summary: string
  description?: string
  security?: Array<Record<string, string[]>>
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
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'nuxt-app API',
      version: currentApiVersion,
      description: 'Versioned routes live under `/api/<version>/` and advertise it via `X-Api-Version`. Infra routes (`/api/auth/*`, `/api/health*`, `GET /api`, `/api/docs*`, `/api/openapi.json`) are unversioned. Failures use the API error contract except Better Auth, which keeps its own. Health 200s are custom liveness/readiness bodies; health failures use the API error contract. Protected operations accept either the Better Auth session cookie or, on deployments that enable it, a bearer token.',
    },
    servers: [
      { url: '/', description: 'Same origin: docs, spec, and API share one host.' },
    ],
    tags: [
      { name: 'meta', description: 'Version registry and API documentation.' },
      ...apiVersions.map(version => ({ name: version, description: `Versioned-route operations (${versionMeta(version).deprecated ? 'deprecated' : 'current'}).` })),
      { name: 'infra', description: 'Unversioned health checks.' },
    ],
    paths,
    components: {
      securitySchemes: securitySchemes(),
      schemas,
    },
  }
}
