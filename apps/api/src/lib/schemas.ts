import { z } from '@hono/zod-openapi'
import { authUserSelectSchema } from '@nuxt-app/db'
import getParamsSchema from 'stoker/openapi/schemas/get-params-schema'

export const idParamsSchema = getParamsSchema({
  name: 'id',
  validator: 'nanoid',
})

export const authUserSchema = authUserSelectSchema

export const authResponseSchema = z.object({
  user: authUserSelectSchema,
  message: z.string().optional(),
})

export const meResponseSchema = z.object({
  user: authUserSelectSchema.nullable(),
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
  user: authUserSelectSchema,
})
