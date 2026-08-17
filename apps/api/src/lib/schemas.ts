import { z } from '@hono/zod-openapi'
import { authUserSchema } from '@nuxt-app/types'
import getParamsSchema from 'stoker/openapi/schemas/get-params-schema'

export const idParamsSchema = getParamsSchema({
  name: 'id',
  validator: 'nanoid',
})

export { authUserSchema }

export const authResponseSchema = z.object({
  user: authUserSchema,
  message: z.string().optional(),
})

export const meResponseSchema = z.object({
  user: authUserSchema.nullable(),
})

export const healthSchema = z.object({
  status: z.string(),
})

export const serviceHealthSchema = z.object({
  status: z.string(),
  service: z.string(),
})

export const adminDashboardSchema = z.object({
  message: z.string(),
  user: authUserSchema,
})
