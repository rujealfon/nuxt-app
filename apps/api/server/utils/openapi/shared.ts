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
  deprecated?: boolean
  security?: Array<Record<string, string[]>>
  requestBody?: OpenApiRequestBody
  responses: Record<string, OpenApiResponse>
}

export type OpenApiPathItem = Partial<
  Record<'get' | 'put' | 'post' | 'delete' | 'patch' | 'options' | 'head', OpenApiOperation>
>

export function toJsonSchema(schema: z.ZodType) {
  const { $schema: _, ...json } = z.toJSONSchema(schema, {
    // JSON Schema cannot express a `Date`. Render one (including
    // `z.coerce.date()`) as an ISO date-time string so a stray date in a
    // contract cannot break the whole document. Match by zod's own dispatch
    // key rather than `instanceof`, so dates built through another zod copy
    // (the tree holds zod 3.25 and 4.x) still match. Other unrepresentable
    // types keep throwing: they mean a contract leaks runtime-only values.
    unrepresentable: ctx =>
      ctx.zodSchema._zod.def.type === 'date'
        ? { type: 'string', format: 'date-time' }
        : 'throw',
  })
  return json
}

export function apiErrorResponse(
  description = 'API error contract. Clients branch on `error`, not message text.',
): OpenApiResponse {
  return {
    description,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiError' },
      },
    },
  }
}

export function jsonRef(
  schemaName: string,
  description: string,
  headers?: OpenApiResponse['headers'],
): OpenApiResponse {
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
