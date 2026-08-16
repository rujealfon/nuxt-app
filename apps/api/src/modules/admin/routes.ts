import { createRouter } from '@api/factory.js'
import { adminDashboardSchema, apiErrorSchema } from '@api/lib/schemas.js'
import { requireAdmin } from '@api/middleware/require-admin.js'
import { createRoute } from '@hono/zod-openapi'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent } from 'stoker/openapi/helpers'

const dashboard = createRoute({
  path: '/dashboard',
  method: 'get',
  tags: ['Admin'],
  summary: 'Admin dashboard',
  middleware: [requireAdmin],
  security: [{ sessionCookie: [] }],
  responses: {
    [HttpStatusCodes.OK]: jsonContent(adminDashboardSchema, 'Admin only'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(apiErrorSchema, 'Unauthenticated'),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(apiErrorSchema, 'Not an admin'),
  },
})

export const adminRoutes = createRouter()
  .openapi(dashboard, (c) => {
    return c.json({
      message: 'Welcome to admin dashboard',
      user: c.get('user')!,
    }, HttpStatusCodes.OK)
  })
