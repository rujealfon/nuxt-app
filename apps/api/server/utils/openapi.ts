import type { ApiVersion } from '@nuxt-app/config'
import type { OpenApiPathItem } from './openapi/shared'
import { apiVersions, currentApiVersion, versionMeta } from '@nuxt-app/config'
import { apiErrorSchema, v1 } from '@nuxt-app/types'
import { z } from 'zod'
import { deprecationHeaders } from './deprecation'
import { healthResponseSchema, readyResponseSchema, versionRegistrySchema } from './infra'
import { authenticatedSecurity, buildAuthOpenApi } from './openapi/auth'
import { apiErrorResponse, jsonRef, toJsonSchema } from './openapi/shared'

const openApiDocumentSchema = z.looseObject({
  openapi: z.string(),
})

const operationsByVersion: Record<ApiVersion, readonly v1.VersionedOperation[]> = {
  v1: v1.operations,
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
  const auth = buildAuthOpenApi()
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
    ...auth.paths,
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
    ...auth.schemas,
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
      auth.tag,
      { name: 'infra', description: 'Unversioned health checks.' },
    ],
    paths,
    components: {
      securitySchemes: auth.securitySchemes,
      schemas,
    },
  }
}
