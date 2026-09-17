import type { ApiVersion } from '@nuxt-app/config'
import { apiVersions, currentApiVersion, versionMeta } from '@nuxt-app/config'
import { apiErrorSchema, v1 } from '@nuxt-app/types'
import { z } from 'zod'
import { healthResponseSchema, readyResponseSchema, versionRegistrySchema } from './infra'

function toJsonSchema(schema: z.ZodType) {
  const { $schema: _, ...json } = z.toJSONSchema(schema)
  return json
}

const openApiDocumentSchema = z.looseObject({
  openapi: z.string(),
})

function apiErrorResponse() {
  return {
    description: 'API error contract. Clients branch on `error`, not message text.',
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

// Every versioned response advertises its version (mirroring
// `defineVersionedHandler`), plus `Deprecation` + `Sunset` once the registry
// marks the version deprecated.
function versionResponseHeaders(version: ApiVersion) {
  const headers: Record<string, { description: string, schema: ReturnType<typeof toJsonSchema> }> = {
    'x-api-version': {
      description: 'API version that served the response.',
      schema: toJsonSchema(z.enum([version])),
    },
  }

  const meta = versionMeta(version)

  if (meta.deprecated && meta.sunset) {
    headers.deprecation = {
      description: 'Present and `true` once the version is deprecated.',
      schema: toJsonSchema(z.enum(['true'])),
    }
    headers.sunset = {
      description: 'Date after which the version may be removed.',
      schema: { ...toJsonSchema(z.string()), example: meta.sunset },
    }
  }

  return headers
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
  responses: Record<string, OpenApiResponse>
}

type OpenApiPathItem = Partial<Record<'get' | 'put' | 'post' | 'delete' | 'patch' | 'options' | 'head', OpenApiOperation>>

function helloOperation(version: ApiVersion): OpenApiOperation {
  return {
    tags: [version],
    summary: 'Greeting operation',
    description: 'Example versioned operation. Versioned routes require an explicit version.',
    responses: {
      200: jsonRef('HelloResponse', 'Greeting message.', versionResponseHeaders(version)),
      default: apiErrorResponse(),
    },
  }
}

// Versioned-route operations served per API version. Keyed by every registered
// version so shipping a new registry entry fails type-check until its
// operations are documented here.
function versionedPaths(): Record<string, OpenApiPathItem> {
  const operationsByVersion: Record<ApiVersion, Record<string, OpenApiPathItem>> = {
    v1: {
      '/api/v1/hello': { get: helloOperation('v1') },
    },
  }

  return Object.fromEntries(
    apiVersions.flatMap(version => Object.entries(operationsByVersion[version])),
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
    ...versionedPaths(),
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

  return {
    openapi: '3.1.0',
    info: {
      title: 'nuxt-app API',
      version: currentApiVersion,
      description: 'Versioned routes live under `/api/<version>/` and advertise it via `X-Api-Version`. Infra routes (`/api/auth/*`, `/api/health*`, `GET /api`, `/api/docs*`, `/api/openapi.json`) are unversioned. Failures use the API error contract except Better Auth and health, which keep their own.',
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
      schemas: {
        HelloResponse: toJsonSchema(v1.helloResponseSchema),
        ApiError: toJsonSchema(apiErrorSchema),
        HealthResponse: toJsonSchema(healthResponseSchema),
        ReadyResponse: toJsonSchema(readyResponseSchema),
        VersionRegistry: toJsonSchema(versionRegistrySchema),
      },
    },
  }
}
