import { db, sessions, users } from '@api/db'
import { createSession, createUser, deleteExpiredSessions } from '@api/modules/auth/service.js'
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

describe('sessions', () => {
  it('removes expired rows instead of only filtering them', async () => {
    const email = `sess-${Date.now()}@example.com`
    await createUser({ email, password: 'password12', name: 'Sess' })
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    })
    expect(user).toBeDefined()

    const now = new Date()
    const [expired] = await db.insert(sessions).values({
      userId: user!.id,
      expiresAt: new Date(now.getTime() - 1000),
      createdAt: now,
    }).returning({ id: sessions.id })
    const [fresh] = await db.insert(sessions).values({
      userId: user!.id,
      expiresAt: new Date(now.getTime() + 60_000),
      createdAt: now,
    }).returning({ id: sessions.id })

    await deleteExpiredSessions(now)

    const remaining = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, user!.id))
    expect(remaining.map(row => row.id)).toEqual([fresh.id])
    expect(remaining.some(row => row.id === expired.id)).toBe(false)
  })

  it('sweeps expired sessions when creating a new one', async () => {
    const email = `sess-login-${Date.now()}@example.com`
    await createUser({ email, password: 'password12', name: 'Sess' })
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    })

    const now = new Date()
    await db.insert(sessions).values({
      userId: user!.id,
      expiresAt: new Date(now.getTime() - 1000),
      createdAt: now,
    })

    const sessionId = await createSession(user!.id)
    const remaining = await db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, user!.id))
    expect(remaining).toEqual([{ id: sessionId }])
  })
})
