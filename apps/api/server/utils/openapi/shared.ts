import { z } from 'zod'

export interface OpenApiResponse {
  description: string
  headers?: Record<string, { description: string, schema: unknown }>
  content?: Record<string, { schema: unknown }>
}

export interface OpenApiRequestBody {
  required?: boolean
  content: Record<string, { schema: unknown }>
}

export interface OpenApiOperation {
  tags: string[]
  summary: string
  description?: string
  security?: Array<Record<string, string[]>>
  requestBody?: OpenApiRequestBody
  responses: Record<string, OpenApiResponse>
}

export type OpenApiPathItem = Partial<Record<'get' | 'put' | 'post' | 'delete' | 'patch' | 'options' | 'head', OpenApiOperation>>

export function toJsonSchema(schema: z.ZodType) {
  const { $schema: _, ...json } = z.toJSONSchema(schema)
  return json
}

export function apiErrorResponse(description = 'API error contract. Clients branch on `error`, not message text.'): OpenApiResponse {
  return {
    description,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiError' },
      },
    },
  }
}

export function jsonRef(schemaName: string, description: string, headers?: OpenApiResponse['headers']): OpenApiResponse {
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
