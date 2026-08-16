import { createRouter } from '@api/factory.js'
import { healthSchema, serviceHealthSchema } from '@api/lib/schemas.js'
import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent } from 'stoker/openapi/helpers'

const tags = ['Health']

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
