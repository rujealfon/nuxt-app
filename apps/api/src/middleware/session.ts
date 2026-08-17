import { factory } from '@api/factory.js'
import { SESSION_COOKIE } from '@api/modules/auth/cookies.js'
import { getSessionUser } from '@api/modules/auth/service.js'
import { getCookie } from 'hono/cookie'

export const sessionMiddleware = factory.createMiddleware(async (c, next) => {
  const sessionId = getCookie(c, SESSION_COOKIE)
  const user = await getSessionUser(sessionId || '')
  c.set('user', user)
  await next()
})
