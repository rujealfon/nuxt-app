import type { AppEnv } from '@api/types.js'
import type { AuthUser } from '@nuxt-app/types'
import type { Context } from 'hono'
import type { CookieOptions } from 'hono/utils/cookie'
import { db, sessions, users } from '@api/db'
import { env } from '@api/env.js'
import { authUserSchema } from '@nuxt-app/types'
import { and, eq, gt, lte } from 'drizzle-orm'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { z } from 'zod'

export const SESSION_COOKIE = 'nuxt_app_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

const sessionIdSchema = z.uuid()
const SESSION_DURATION_MS = SESSION_MAX_AGE_SECONDS * 1000

function asSessionId(sessionId: string | undefined): string | undefined {
  const parsed = sessionIdSchema.safeParse(sessionId)
  return parsed.success ? parsed.data : undefined
}

function sessionCookieOptions(input: {
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

export function attachSessionCookie(
  c: Context,
  sessionId: string,
  cookieEnv?: { nodeEnv: string, cookieDomain?: string },
) {
  setCookie(c, SESSION_COOKIE, sessionId, sessionCookieOptions(cookieEnv))
}

function clearSessionCookie(c: Context<AppEnv>) {
  const { maxAge: _maxAge, ...options } = sessionCookieOptions()
  deleteCookie(c, SESSION_COOKIE, options)
}

export async function deleteExpiredSessions(now = new Date()) {
  await db.delete(sessions).where(lte(sessions.expiresAt, now))
}

export async function issueSession(userPk: string): Promise<string> {
  const now = new Date()
  await deleteExpiredSessions(now)
  const [session] = await db.insert(sessions).values({
    userId: userPk,
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
  }).returning({ id: sessions.id })

  if (!session)
    throw new Error('Failed to create session')

  return session.id
}

export async function readSessionUser(sessionId: string): Promise<AuthUser | null> {
  const id = asSessionId(sessionId)
  if (!id)
    return null

  const result = await db
    .select({
      publicId: users.publicId,
      email: users.email,
      name: users.name,
      role: users.role,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())))
    .limit(1)

  const row = result[0]
  if (!row)
    return null

  return toAuthUser(row)
}

export function toAuthUser(user: {
  publicId: string
  email: string
  name: string
  role: string
}): AuthUser {
  return authUserSchema.parse({
    id: user.publicId,
    email: user.email,
    name: user.name,
    role: user.role,
  })
}

async function revokeSession(sessionId: string) {
  const id = asSessionId(sessionId)
  if (!id)
    return
  await db.delete(sessions).where(eq(sessions.id, id))
}

export async function endSession(c: Context<AppEnv>) {
  const sessionId = getCookie(c, SESSION_COOKIE)
  if (sessionId)
    await revokeSession(sessionId)
  clearSessionCookie(c)
}

export async function currentUser(c: Context<AppEnv>): Promise<AuthUser | null> {
  const sessionId = getCookie(c, SESSION_COOKIE)
  return readSessionUser(sessionId || '')
}
