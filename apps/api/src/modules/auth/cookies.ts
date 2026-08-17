import type { AppEnv } from '@api/types.js'
import type { Context } from 'hono'
import type { CookieOptions } from 'hono/utils/cookie'
import { env } from '@api/env.js'
import { deleteCookie, setCookie } from 'hono/cookie'

export const SESSION_COOKIE = 'nuxt_app_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export function sessionCookieOptions(input: {
  nodeEnv: string
  cookieDomain?: string
} = {
  nodeEnv: env.NODE_ENV,
  cookieDomain: env.COOKIE_DOMAIN,
}): CookieOptions {
  const isProd = input.nodeEnv === 'production'

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
    domain: input.cookieDomain,
  }
}

export function setSessionCookie(c: Context<AppEnv>, sessionId: string) {
  setCookie(c, SESSION_COOKIE, sessionId, sessionCookieOptions())
}

export function clearSessionCookie(c: Context<AppEnv>) {
  const { maxAge: _maxAge, ...options } = sessionCookieOptions()
  deleteCookie(c, SESSION_COOKIE, options)
}
