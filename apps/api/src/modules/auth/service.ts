import type { AuthUser } from '@nuxt-app/types'
import { db, sessions, users } from '@api/db'
import bcrypt from 'bcryptjs'
import { and, eq, gt } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import * as HttpStatusCodes from 'stoker/http-status-codes'
import { z } from 'zod'

const sessionIdSchema = z.uuid()

function asSessionId(sessionId: string | undefined): string | undefined {
  const parsed = sessionIdSchema.safeParse(sessionId)
  return parsed.success ? parsed.data : undefined
}

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7
const SALT_ROUNDS = 12

function toAuthUser(user: { publicId: string, email: string, name: string, role: string }): AuthUser {
  return {
    id: user.publicId,
    email: user.email,
    name: user.name,
    role: user.role as 'user' | 'admin',
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

function pgConstraint(err: unknown): string | undefined {
  let current: unknown = err
  while (current && typeof current === 'object') {
    if ('constraint' in current && typeof current.constraint === 'string')
      return current.constraint
    current = 'cause' in current ? current.cause : undefined
  }
}

export async function createUser(data: {
  email: string
  password: string
  name: string
  role?: 'user' | 'admin'
}): Promise<AuthUser | null> {
  const now = new Date()
  const passwordHash = await hashPassword(data.password)

  try {
    const [row] = await db.insert(users).values({
      email: data.email.toLowerCase(),
      name: data.name,
      passwordHash,
      role: data.role || 'user',
      createdAt: now,
      updatedAt: now,
    }).returning({
      publicId: users.publicId,
      email: users.email,
      name: users.name,
      role: users.role,
    })

    return toAuthUser(row)
  }
  catch (err) {
    if (pgConstraint(err) === 'users_email_unique')
      return null
    throw err
  }
}

export async function authenticateUser(email: string, password: string): Promise<{
  user: AuthUser
  userId: string
}> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  })

  if (!user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, { message: 'Invalid email or password' })
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, { message: 'Invalid email or password' })
  }

  return {
    user: toAuthUser(user),
    userId: user.id,
  }
}

export async function createSession(userId: string): Promise<string> {
  const now = new Date()
  const [session] = await db.insert(sessions).values({
    userId,
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
    createdAt: now,
  }).returning({ id: sessions.id })

  return session.id
}

export async function getSessionUser(sessionId: string): Promise<AuthUser | null> {
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

export async function deleteSession(sessionId: string) {
  const id = asSessionId(sessionId)
  if (!id)
    return
  await db.delete(sessions).where(eq(sessions.id, id))
}

export async function deleteUserSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId))
}
