import type { Context } from 'hono'
import type { AppEnv } from '../../types.js'
import { deleteCookie, setCookie } from 'hono/cookie'
import { env } from '../../env.js'

export const SESSION_COOKIE = 'nuxt_app_session'

const isProd = env.NODE_ENV === 'production'
const cookieDomain = env.COOKIE_DOMAIN

export function setSessionCookie(c: Context<AppEnv>, sessionId: string) {
  setCookie(c, SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    domain: cookieDomain,
  })
}

export function clearSessionCookie(c: Context<AppEnv>) {
  deleteCookie(c, SESSION_COOKIE, {
    path: '/',
    domain: cookieDomain,
  })
}
