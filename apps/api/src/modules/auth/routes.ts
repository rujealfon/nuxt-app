import { createRouter } from '@api/factory.js'
import { apiErrorSchema, authResponseSchema, meResponseSchema, messageSchema } from '@api/lib/schemas.js'
import { authRateLimit } from '@api/middleware/rate-limit.js'
import { clearSessionCookie, SESSION_COOKIE, setSessionCookie } from '@api/modules/auth/cookies.js'
import {
  authenticateUser,
  createSession,
  createUserAndSession,
  deleteSession,
} from '@api/modules/auth/service.js'
import { createRoute } from '@hono/zod-openapi'
import { loginSchema, registerSchema } from '@nuxt-app/types'
import { getCookie } from 'hono/cookie'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'

const tags = ['Auth']

const register = createRoute({
  path: '/register',
  method: 'post',
  tags,
  summary: 'Register',
  middleware: [authRateLimit],
  request: {
    body: jsonContentRequired(registerSchema, 'Registration payload'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(authResponseSchema, 'Registered'),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(apiErrorSchema, 'Validation error'),
  },
})

const login = createRoute({
  path: '/login',
  method: 'post',
  tags,
  summary: 'Log in',
  middleware: [authRateLimit],
  request: {
    body: jsonContentRequired(loginSchema, 'Login payload'),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(authResponseSchema, 'Logged in'),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(apiErrorSchema, 'Validation or auth error'),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(apiErrorSchema, 'Invalid credentials'),
  },
})

const logout = createRoute({
  path: '/logout',
  method: 'post',
  tags,
  summary: 'Log out',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(messageSchema, 'Logged out'),
  },
})

const me = createRoute({
  path: '/me',
  method: 'get',
  tags,
  summary: 'Current user',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(meResponseSchema, 'Session user, or null'),
  },
})

export const authRoutes = createRouter()
  .openapi(register, async (c) => {
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
    }, HttpStatusCodes.OK)
  })
  .openapi(login, async (c) => {
    const { email, password } = c.req.valid('json')
    const user = await authenticateUser(email, password)
    const sessionId = await createSession(user.id)
    setSessionCookie(c, sessionId)

    return c.json({
      user,
      message: 'Logged in successfully',
    }, HttpStatusCodes.OK)
  })
  .openapi(logout, async (c) => {
    const sessionId = getCookie(c, SESSION_COOKIE)
    if (sessionId)
      await deleteSession(sessionId)
    clearSessionCookie(c)
    return c.json({ message: 'Logged out' }, HttpStatusCodes.OK)
  })
  .openapi(me, (c) => {
    return c.json({ user: c.get('user') }, HttpStatusCodes.OK)
  })
