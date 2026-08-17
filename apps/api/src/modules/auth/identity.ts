import type { AuthUser } from '@nuxt-app/types'
import { db, sessions, users } from '@api/db'
import { toAuthUser } from '@api/modules/auth/to-auth-user.js'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'

const SALT_ROUNDS = 12

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

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createUser(data: {
  email: string
  password: string
  name: string
  role?: AuthUser['role']
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

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  })

  const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH)
  if (!user || !valid)
    return null

  return toAuthUser(user)
}

async function resetUserAsAdmin(userId: string, passwordHash: string) {
  await db.transaction(async (tx) => {
    await tx.update(users).set({
      passwordHash,
      role: 'admin',
      updatedAt: new Date(),
    }).where(eq(users.id, userId))
    await tx.delete(sessions).where(eq(sessions.userId, userId))
  })
}

export async function ensureAdmin(data: {
  email: string
  password: string
  name: string
}): Promise<{ created: boolean, alreadyAdmin: boolean, user: AuthUser }> {
  const email = data.email.toLowerCase()
  let existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  })

  if (!existing) {
    const user = await createUser({
      email,
      password: data.password,
      name: data.name,
      role: 'admin',
    })
    if (user)
      return { created: true, alreadyAdmin: false, user }

    existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    })
    if (!existing)
      throw new Error(`User ${email} could not be created or found`)
  }

  const alreadyAdmin = existing.role === 'admin'
  const passwordHash = await hashPassword(data.password)
  await resetUserAsAdmin(existing.id, passwordHash)
  return {
    created: false,
    alreadyAdmin,
    user: toAuthUser({ ...existing, role: 'admin' }),
  }
}
