import { factory } from '@api/factory.js'
import { authRateLimit } from '@api/middleware/rate-limit.js'
import { clearSessionCookie, SESSION_COOKIE, setSessionCookie } from '@api/modules/auth/cookies.js'
import {
  authenticateUser,
  createSession,
  createUserAndSession,
  deleteSession,
} from '@api/modules/auth/service.js'
import { zValidator } from '@hono/zod-validator'
import { loginSchema, registerSchema } from '@nuxt-app/types'
import { getCookie } from 'hono/cookie'

function jsonError(
  result: { success: boolean, error?: { issues: { message: string }[] } },
  c: { json: (body: { error: string }, status: 400) => Response },
) {
  if (!result.success)
    return c.json({ error: result.error?.issues[0]?.message ?? 'Invalid request' }, 400)
}

export const authRoutes = factory.createApp()
  .post('/register', authRateLimit, zValidator('json', registerSchema, jsonError), async (c) => {
    const { email, password, name } = c.req.valid('json')
    const { user, sessionId } = await createUserAndSession({ email, password, name })
    setSessionCookie(c, sessionId)

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      message: 'Registered successfully',
    })
  })
  .post('/login', authRateLimit, zValidator('json', loginSchema, jsonError), async (c) => {
    const { email, password } = c.req.valid('json')
    const user = await authenticateUser(email, password)
    const sessionId = await createSession(user.id)
    setSessionCookie(c, sessionId)

    return c.json({
      user,
      message: 'Logged in successfully',
    })
  })
  .post('/logout', async (c) => {
    const sessionId = getCookie(c, SESSION_COOKIE)
    if (sessionId)
      await deleteSession(sessionId)
    clearSessionCookie(c)
    return c.json({ message: 'Logged out' })
  })
  .get('/me', (c) => {
    return c.json({ user: c.get('user') })
  })
