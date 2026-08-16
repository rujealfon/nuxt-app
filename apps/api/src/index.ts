import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import authRoutes from './routes/auth'
import { sessionMiddleware, requireAuth, requireAdmin } from './middleware/auth'

const app = new Hono()

const allowedOrigins = [
  process.env.APP_URL || 'http://localhost:3000',
  process.env.ADMIN_URL || 'http://localhost:3002',
  process.env.SITE_URL || 'http://localhost:3003',
]

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: (origin) => {
      if (!origin || allowedOrigins.includes(origin)) return origin || allowedOrigins[0]
      return allowedOrigins[0]
    },
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })
)

app.use('*', sessionMiddleware)

// Public health check
app.get('/', (c) => c.json({ status: 'ok', service: 'mysite-api' }))
app.get('/health', (c) => c.json({ status: 'ok' }))

// Auth routes
app.route('/auth', authRoutes)

// Example protected routes
app.get('/me', requireAuth, (c) => {
  return c.json({ user: c.get('user') })
})

app.get('/admin/dashboard', requireAdmin, (c) => {
  return c.json({
    message: 'Welcome to admin dashboard',
    user: c.get('user'),
  })
})

const port = Number(process.env.API_PORT) || 3001

console.log(`API running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})
