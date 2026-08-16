import type { AuthUser } from '@nuxt-app/types'
import { getCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import { getSessionUser } from '../lib/auth.js'

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser | null
  }
}

export const sessionMiddleware = createMiddleware(async (c, next) => {
  const sessionId = getCookie(c, 'nuxt_app_session')
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
