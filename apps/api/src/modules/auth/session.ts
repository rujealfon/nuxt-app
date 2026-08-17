import type { AppEnv } from '@api/types.js'
import type { AuthUser } from '@nuxt-app/types'
import type { Context } from 'hono'
import { db, sessions, users } from '@api/db'
import {
  clearSessionCookie,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  setSessionCookie,
} from '@api/modules/auth/cookies.js'
import { toAuthUser } from '@api/modules/auth/to-auth-user.js'
import { and, eq, gt, lte } from 'drizzle-orm'
import { getCookie } from 'hono/cookie'
import { z } from 'zod'

const sessionIdSchema = z.uuid()

function asSessionId(sessionId: string | undefined): string | undefined {
  const parsed = sessionIdSchema.safeParse(sessionId)
  return parsed.success ? parsed.data : undefined
}

const SESSION_DURATION_MS = SESSION_MAX_AGE_SECONDS * 1000

export async function deleteExpiredSessions(now = new Date()) {
  await db.delete(sessions).where(lte(sessions.expiresAt, now))
}

async function userPkByPublicId(publicId: string): Promise<string | undefined> {
  const row = await db.query.users.findFirst({
    where: eq(users.publicId, publicId),
    columns: { id: true },
  })
  return row?.id
}

async function issueSession(user: AuthUser): Promise<string> {
  const userId = await userPkByPublicId(user.id)
  if (!userId)
    throw new Error('Failed to create session')

  const now = new Date()
  await deleteExpiredSessions(now)
  const [session] = await db.insert(sessions).values({
    userId,
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
    createdAt: now,
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

async function revokeSession(sessionId: string) {
  const id = asSessionId(sessionId)
  if (!id)
    return
  await db.delete(sessions).where(eq(sessions.id, id))
}

export async function startSession(c: Context<AppEnv>, user: AuthUser) {
  const sessionId = await issueSession(user)
  setSessionCookie(c, sessionId)
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
