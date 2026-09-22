import { z } from 'zod'

export const helloResponseSchema = z.object({
  message: z.string(),
})

export type HelloResponse = z.infer<typeof helloResponseSchema>

// One documented versioned operation. `authenticated` marks routes gated by
// `requireActor`; the OpenAPI document renders those with a security
// requirement and a documented 401. Omit it for public routes.
export interface VersionedOperation {
  suffix: string
  method: 'get' | 'put' | 'post' | 'delete' | 'patch' | 'options' | 'head'
  summary: string
  description?: string
  responseName: string
  responseSchema: z.ZodType
  authenticated?: boolean
}

export const operations: readonly VersionedOperation[] = [
  {
    suffix: '/hello',
    method: 'get',
    summary: 'Greeting operation',
    description: 'Example versioned operation. Versioned routes require an explicit version.',
    responseName: 'HelloResponse',
    responseSchema: helloResponseSchema,
  },
]
