import { z } from '@hono/zod-openapi'
import { authUserSelectSchema } from '@nuxt-app/db'

export const apiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
})

export const authUserSchema = authUserSelectSchema

export const authResponseSchema = z.object({
  user: authUserSelectSchema,
  message: z.string().optional(),
})

export const meResponseSchema = z.object({
  user: authUserSelectSchema.nullable(),
})

export const messageSchema = z.object({
  message: z.string(),
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
