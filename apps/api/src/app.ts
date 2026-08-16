import { allowedOrigins, isDev } from '@api/env.js'
import { createRouter } from '@api/factory.js'
import { onError } from '@api/middleware/error.js'
import { pinoLogger } from '@api/middleware/pino-logger.js'
import { rateLimit } from '@api/middleware/rate-limit.js'
import { sessionMiddleware } from '@api/middleware/session.js'
import { adminRoutes } from '@api/modules/admin/routes.js'
import { authRoutes } from '@api/modules/auth/routes.js'
import { configureOpenAPI } from '@api/modules/docs/routes.js'
import { healthRoutes } from '@api/modules/health/routes.js'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import { csrf } from 'hono/csrf'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'

const base = createRouter()

base.use('*', requestId())
base.use('*', pinoLogger())
base.use('*', secureHeaders(isDev
  ? {
      contentSecurityPolicy: {
        defaultSrc: ['\'self\''],
        scriptSrc: ['\'self\'', '\'unsafe-inline\'', 'https://cdn.jsdelivr.net'],
        styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https://cdn.jsdelivr.net', 'https://fonts.scalar.com'],
        imgSrc: ['\'self\'', 'data:', 'https:'],
        fontSrc: ['\'self\'', 'data:', 'https://cdn.jsdelivr.net', 'https://fonts.scalar.com'],
        connectSrc: ['\'self\'', 'https://cdn.jsdelivr.net'],
      },
    }
  : undefined))
base.use(
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
base.use('*', csrf({ origin: allowedOrigins }))
base.use('*', bodyLimit({
  maxSize: 64 * 1024,
  onError: c => c.json({ error: 'Payload too large' }, 413),
}))
base.use('*', rateLimit)
base.use('*', sessionMiddleware)
base.onError(onError)
base.notFound(c => c.json({ error: 'Not Found' }, 404))

if (isDev)
  configureOpenAPI(base)

function mountApi<T extends typeof base>(app: T) {
  return app
    .route('/', healthRoutes)
    .route('/auth', authRoutes)
    .route('/admin', adminRoutes)
}

const app = mountApi(base)

export default app
export type AppType = ReturnType<typeof mountApi>
