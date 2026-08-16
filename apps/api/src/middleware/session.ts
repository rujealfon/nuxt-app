import { getCookie } from 'hono/cookie'
import { factory } from '../factory.js'
import { SESSION_COOKIE } from '../modules/auth/cookies.js'
import { getSessionUser } from '../modules/auth/service.js'

export const sessionMiddleware = factory.createMiddleware(async (c, next) => {
  const sessionId = getCookie(c, SESSION_COOKIE)
  const user = await getSessionUser(sessionId || '')
  c.set('user', user)
  await next()
})
