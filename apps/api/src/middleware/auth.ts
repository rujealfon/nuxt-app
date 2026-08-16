import { createMiddleware } from 'hono/factory'
import { getCookie } from 'hono/cookie'
import { getSessionUser } from '../lib/auth'
import type { AuthUser } from '@mysite/types'

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser | null
  }
}

export const sessionMiddleware = createMiddleware(async (c, next) => {
  const sessionId = getCookie(c, 'mysite_session')
  const user = await getSessionUser(sessionId || '')
  c.set('user', user)
  await next()
})

export const requireAuth = createMiddleware(async (c, next) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
})

export const requireAdmin = createMiddleware(async (c, next) => {
  const user = c.get('user')
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  if (user.role !== 'admin') {
    return c.json({ error: 'Forbidden – admin only' }, 403)
  }
  await next()
})
