import type { AuthUser } from '@nuxt-app/types'
import { db, sessions, users } from '@api/db'
import bcrypt from 'bcryptjs'
import { and, eq, gt, lte } from 'drizzle-orm'
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

/** 12-round bcrypt of an unused secret so missing-user logins pay the same compare cost. */
const DUMMY_PASSWORD_HASH = '$2b$12$Q2I7Jb2EcItOFdLKT4YIV.KlwoZPbbrnVz4WKArwpvQBgcolUqD9m'

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

    if (!row)
      throw new Error('Failed to create user')

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

  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH)
  if (!user || !valid) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, { message: 'Invalid email or password' })
  }

  return {
    user: toAuthUser(user),
    userId: user.id,
  }
}

export async function deleteExpiredSessions(now = new Date()) {
  await db.delete(sessions).where(lte(sessions.expiresAt, now))
}

export async function createSession(userId: string): Promise<string> {
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

export async function resetUserAsAdmin(userId: string, passwordHash: string) {
  await db.transaction(async (tx) => {
    await tx.update(users).set({
      passwordHash,
      role: 'admin',
      updatedAt: new Date(),
    }).where(eq(users.id, userId))
    await tx.delete(sessions).where(eq(sessions.userId, userId))
  })
}
