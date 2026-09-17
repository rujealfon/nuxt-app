import type { ApiVersion } from '@nuxt-app/config'
import { apiVersions, currentApiVersion, versionMeta } from '@nuxt-app/config'
import { apiErrorSchema, v1 } from '@nuxt-app/types'
import { z } from 'zod'

// JSON Schema fragments. Versioned-route shapes derive from the shared Zod
// contracts so the served document cannot drift from what handlers parse;
// infra shapes without a Zod contract are written out next to the route they
// describe.
type JsonSchema = Record<string, unknown>

interface OpenApiHeader {
  description: string
  schema: JsonSchema
}

interface OpenApiResponse {
  description: string
  headers?: Record<string, OpenApiHeader>
  content?: Record<string, { schema: JsonSchema }>
}

interface OpenApiOperation {
  tags: string[]
  summary: string
  description?: string
  responses: Record<string, OpenApiResponse>
}

interface OpenApiPathItem {
  get: OpenApiOperation
}

export interface OpenApiDocument {
  openapi: string
  info: {
    title: string
    version: string
    description: string
  }
  servers: { url: string, description: string }[]
  tags: { name: string, description: string }[]
  paths: Record<string, OpenApiPathItem>
  components: { schemas: Record<string, JsonSchema> }
}

function toJsonSchema(schema: z.ZodType): JsonSchema {
  return z.toJSONSchema(schema) as unknown as JsonSchema
}

function apiErrorResponse(): OpenApiResponse {
  return {
    description: 'API error contract. Clients branch on `error`, not message text.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiError' },
      },
    },
  }
}

// Every versioned response advertises its version (mirroring
// `defineVersionedHandler`), plus `Deprecation` + `Sunset` once the registry
// marks the version deprecated.
function versionResponseHeaders(version: ApiVersion): Record<string, OpenApiHeader> {
  const headers: Record<string, OpenApiHeader> = {
    'x-api-version': {
      description: 'API version that served the response.',
      schema: { type: 'string', enum: [version] },
    },
  }

  const meta = versionMeta(version)

  if (meta.deprecated && meta.sunset) {
    headers.deprecation = {
      description: 'Present and `true` once the version is deprecated.',
      schema: { type: 'string', enum: ['true'] },
    }
    headers.sunset = {
      description: 'Date after which the version may be removed.',
      schema: { type: 'string', example: meta.sunset },
    }
  }

  return headers
}

function helloOperation(version: ApiVersion): OpenApiOperation {
  return {
    tags: [version],
    summary: 'Greeting operation',
    description: 'Example versioned operation. Versioned routes require an explicit version.',
    responses: {
      200: {
        description: 'Greeting message.',
        headers: versionResponseHeaders(version),
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/HelloResponse' },
          },
        },
      },
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

// Shape of `GET /api`, which reports the version registry from
// `@nuxt-app/config`. No Zod contract exists for it; keep this beside the
// route it describes (`server/api/index.get.ts`).
function versionRegistrySchema(): JsonSchema {
  return {
    type: 'object',
    properties: {
      current: { type: 'string', description: 'Version new clients should target.' },
      versions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            version: { type: 'string' },
            deprecated: { type: 'boolean' },
            sunset: { type: 'string', description: 'Present once the version is deprecated.' },
          },
          required: ['version', 'deprecated'],
          additionalProperties: false,
        },
      },
    },
    required: ['current', 'versions'],
    additionalProperties: false,
  }
}

// Builds the document Scalar renders. Pure: routes serve the return value as
// JSON, specs import it without touching shared state.
export function buildOpenApiDocument(): OpenApiDocument {
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
    paths: {
      '/api': {
        get: {
          tags: ['meta'],
          summary: 'Version registry',
          description: 'Reports the current version and per-version deprecation metadata.',
          responses: {
            200: {
              description: 'Version registry.',
              content: { 'application/json': { schema: versionRegistrySchema() } },
            },
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
              content: { 'application/json': { schema: { type: 'object' } } },
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
            200: {
              description: 'Service status.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      service: { type: 'string' },
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                    required: ['status', 'service', 'timestamp'],
                    additionalProperties: false,
                  },
                },
              },
            },
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
            200: {
              description: 'Dependency checks.',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      database: { type: 'boolean' },
                      redis: { type: 'boolean' },
                    },
                    required: ['database', 'redis'],
                    additionalProperties: false,
                  },
                },
              },
            },
            default: apiErrorResponse(),
          },
        },
      },
    },
    components: {
      schemas: {
        HelloResponse: toJsonSchema(v1.helloResponseSchema),
        ApiError: toJsonSchema(apiErrorSchema),
      },
    },
  }
}
