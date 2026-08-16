import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { csrf } from 'hono/csrf'
import { logger } from 'hono/logger'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'
import { allowedOrigins } from './env.js'
import { factory } from './factory.js'
import { onError } from './middleware/error.js'
import { sessionMiddleware } from './middleware/session.js'
import { adminRoutes } from './modules/admin/routes.js'
import { authRoutes } from './modules/auth/routes.js'
import { healthRoutes } from './modules/health/routes.js'

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
