import { createRoute, z } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent } from 'stoker/openapi/helpers'
import { createRouter } from '#api/factory.js'

const tags = ['Health']

const healthSchema = z.object({
  status: z.string(),
})

const serviceHealthSchema = z.object({
  status: z.string(),
  service: z.string(),
})

const root = createRoute({
  path: '/',
  method: 'get',
  tags,
  summary: 'Service status',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(serviceHealthSchema, 'OK'),
  },
})

const health = createRoute({
  path: '/health',
  method: 'get',
  tags,
  summary: 'Health check',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(healthSchema, 'OK'),
  },
})

export const healthRoutes = createRouter()
  .openapi(root, c => c.json({ status: 'ok', service: 'nuxt-app-api' }, HttpStatusCodes.OK))
  .openapi(health, c => c.json({ status: 'ok' }, HttpStatusCodes.OK))
