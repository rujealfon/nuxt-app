import { allowedOrigins } from '@api/env.js'
import { factory } from '@api/factory.js'
import { onError } from '@api/middleware/error.js'
import { sessionMiddleware } from '@api/middleware/session.js'
import { adminRoutes } from '@api/modules/admin/routes.js'
import { authRoutes } from '@api/modules/auth/routes.js'
import { healthRoutes } from '@api/modules/health/routes.js'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { csrf } from 'hono/csrf'
import { logger } from 'hono/logger'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'

const app = factory.createApp()
  .use('*', requestId())
  .use('*', logger())
  .use('*', secureHeaders())
  .use(
    '*',
    cors({
      origin: (origin) => {
        if (!origin || allowedOrigins.includes(origin))
          return origin || allowedOrigins[0]
        return allowedOrigins[0]
      },
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    }),
  )
  .use('*', csrf({ origin: allowedOrigins }))
  .use('*', bodyLimit({
    maxSize: 64 * 1024,
    onError: c => c.json({ error: 'Payload too large' }, 413),
  }))
  .use('*', sessionMiddleware)
  .onError(onError)
  .notFound(c => c.json({ error: 'Not Found' }, 404))
  .route('/', healthRoutes)
  .route('/auth', authRoutes)
  .route('/admin', adminRoutes)

export default app
export type AppType = typeof app
