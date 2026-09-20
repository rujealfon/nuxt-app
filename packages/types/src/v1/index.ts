import { z } from 'zod'

export const helloResponseSchema = z.object({
  message: z.string(),
})

export type HelloResponse = z.infer<typeof helloResponseSchema>

export const operations = [
  {
    suffix: '/hello',
    method: 'get',
    summary: 'Greeting operation',
    description: 'Example versioned operation. Versioned routes require an explicit version.',
    responseName: 'HelloResponse',
    responseSchema: helloResponseSchema,
  },
] as const
