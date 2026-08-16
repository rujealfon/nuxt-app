import { createRouter } from '@api/factory.js'
import { authResponseSchema, meResponseSchema } from '@api/lib/schemas.js'
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
import * as HttpStatusPhrases from 'stoker/http-status-phrases'
import { jsonContent, jsonContentRequired } from 'stoker/openapi/helpers'
import createErrorSchema from 'stoker/openapi/schemas/create-error-schema'
import createMessageObjectSchema from 'stoker/openapi/schemas/create-message-object'

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
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createMessageObjectSchema('Email already registered'),
      HttpStatusPhrases.BAD_REQUEST,
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(registerSchema),
      'Validation error',
    ),
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
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      createMessageObjectSchema('Invalid email or password'),
      HttpStatusPhrases.UNAUTHORIZED,
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(loginSchema),
      'Validation error',
    ),
  },
})

const logout = createRoute({
  path: '/logout',
  method: 'post',
  tags,
  summary: 'Log out',
  responses: {
    [HttpStatusCodes.OK]: jsonContent(createMessageObjectSchema('Logged out'), 'Logged out'),
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
    const { user, userId } = await authenticateUser(email, password)
    const sessionId = await createSession(userId)
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
