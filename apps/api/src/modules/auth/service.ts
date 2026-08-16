import type { AuthUser } from '@nuxt-app/types'
import { db, sessions, users } from '@nuxt-app/db'
import bcrypt from 'bcryptjs'
import { and, eq, gt } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import * as HttpStatusCodes from 'stoker/http-status-codes'

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

export async function createUser(data: {
  email: string
  password: string
  name: string
  role?: 'user' | 'admin'
}) {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, data.email.toLowerCase()),
  })

  if (existing) {
    throw new HTTPException(HttpStatusCodes.BAD_REQUEST, { message: 'Email already registered' })
  }

  const now = new Date()
  const passwordHash = await hashPassword(data.password)
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

export async function createUserAndSession(data: {
  email: string
  password: string
  name: string
  role?: 'user' | 'admin'
}) {
  return db.transaction(async (tx) => {
    const existing = await tx.query.users.findFirst({
      where: eq(users.email, data.email.toLowerCase()),
    })

    if (existing)
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, { message: 'Email already registered' })

    const now = new Date()
    const passwordHash = await hashPassword(data.password)
    const role = data.role || 'user'

    const [user] = await tx.insert(users).values({
      email: data.email.toLowerCase(),
      name: data.name,
      passwordHash,
      role,
      createdAt: now,
      updatedAt: now,
    }).returning({
      id: users.id,
      publicId: users.publicId,
      email: users.email,
      name: users.name,
      role: users.role,
    })

    const [session] = await tx.insert(sessions).values({
      userId: user.id,
      expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
      createdAt: now,
    }).returning({ id: sessions.id })

    return {
      user: toAuthUser(user),
      sessionId: session.id,
    }
  })
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
  if (!sessionId)
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
    .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
    .limit(1)

  const row = result[0]
  if (!row)
    return null

  return toAuthUser(row)
}

export async function deleteSession(sessionId: string) {
  if (!sessionId)
    return
  await db.delete(sessions).where(eq(sessions.id, sessionId))
}

export async function deleteUserSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId))
}
