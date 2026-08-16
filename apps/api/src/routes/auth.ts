import process from 'node:process'
import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import {
  authenticateUser,
  createSession,
  createUser,
  deleteSession,
  getSessionUser,
} from '../lib/auth.js'

const SESSION_COOKIE = 'nuxt_app_session'
const isProd = process.env.NODE_ENV === 'production'
const cookieDomain = process.env.COOKIE_DOMAIN || undefined // e.g. '.nuxt-app.com' in production

const auth = new Hono()

function setSessionCookie(c: any, sessionId: string) {
  setCookie(c, SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    domain: cookieDomain, // important for cross-subdomain
  })
}

function clearSessionCookie(c: any) {
  deleteCookie(c, SESSION_COOKIE, {
    path: '/',
    domain: cookieDomain,
  })
}

// POST /auth/register
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const { email, password, name } = body

    if (!email || !password || !name) {
      return c.json({ error: 'Email, password and name are required' }, 400)
    }

    if (password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400)
    }

    const user = await createUser({ email, password, name })
    const sessionId = await createSession(user.id)
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
  }
  catch (err: any) {
    return c.json({ error: err.message || 'Registration failed' }, 400)
  }
})

// POST /auth/login
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const { email, password } = body

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400)
    }

    const user = await authenticateUser(email, password)
    const sessionId = await createSession(user.id)
    setSessionCookie(c, sessionId)

    return c.json({
      user,
      message: 'Logged in successfully',
    })
  }
  catch (err: any) {
    return c.json({ error: err.message || 'Login failed' }, 401)
  }
})

// POST /auth/logout
auth.post('/logout', async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE)
  if (sessionId) {
    await deleteSession(sessionId)
  }
  clearSessionCookie(c)
  return c.json({ message: 'Logged out' })
})

// GET /auth/me
auth.get('/me', async (c) => {
  const sessionId = getCookie(c, SESSION_COOKIE)
  const user = await getSessionUser(sessionId || '')
  return c.json({ user })
})

export default auth
