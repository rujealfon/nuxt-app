import type { AuthUser } from '@nuxt-app/types'
import { db, sessions, users } from '@nuxt-app/db'
import bcrypt from 'bcryptjs'
import { and, eq, gt } from 'drizzle-orm'
import { nanoid } from 'nanoid'

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7 // 7 days
const SALT_ROUNDS = 12

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
    throw new Error('Email already registered')
  }

  const id = nanoid()
  const now = new Date()
  const passwordHash = await hashPassword(data.password)

  await db.insert(users).values({
    id,
    email: data.email.toLowerCase(),
    name: data.name,
    passwordHash,
    role: data.role || 'user',
    createdAt: now,
    updatedAt: now,
  })

  return { id, email: data.email.toLowerCase(), name: data.name, role: data.role || 'user' }
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  })

  if (!user) {
    throw new Error('Invalid email or password')
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    throw new Error('Invalid email or password')
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as 'user' | 'admin',
  }
}

export async function createSession(userId: string): Promise<string> {
  const sessionId = nanoid(32)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS)

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
    createdAt: now,
  })

  return sessionId
}

export async function getSessionUser(sessionId: string): Promise<AuthUser | null> {
  if (!sessionId)
    return null

  const result = await db
    .select({
      userId: users.id,
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

  return {
    id: row.userId,
    email: row.email,
    name: row.name,
    role: row.role as 'user' | 'admin',
  }
}

export async function deleteSession(sessionId: string) {
  if (!sessionId)
    return
  await db.delete(sessions).where(eq(sessions.id, sessionId))
}

export async function deleteUserSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId))
}
