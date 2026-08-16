import { createRouter } from '@api/factory.js'
import { adminDashboardSchema } from '@api/lib/schemas.js'
import { requireAdmin } from '@api/middleware/require-admin.js'
import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import * as HttpStatusPhrases from 'stoker/http-status-phrases'
import { jsonContent } from 'stoker/openapi/helpers'
import createMessageObjectSchema from 'stoker/openapi/schemas/create-message-object'

const dashboard = createRoute({
  path: '/dashboard',
  method: 'get',
  tags: ['Admin'],
  summary: 'Admin dashboard',
  middleware: [requireAdmin],
  security: [{ sessionCookie: [] }],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(adminDashboardSchema, 'Admin only'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      createMessageObjectSchema(HttpStatusPhrases.UNAUTHORIZED),
      HttpStatusPhrases.UNAUTHORIZED,
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      createMessageObjectSchema(HttpStatusPhrases.FORBIDDEN),
      HttpStatusPhrases.FORBIDDEN,
    ),
  },
})

export const adminRoutes = createRouter()
  .openapi(dashboard, (c) => {
    return c.json({
      message: 'Welcome to admin dashboard',
      user: c.get('user')!,
    }, HttpStatusCodes.OK)
  })
