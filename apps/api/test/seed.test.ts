import { db, users } from '@api/db'
import { createSession, createUser, getSessionUser, verifyPassword } from '@api/modules/auth/service.js'
import { resolveAdminSeedEmail, resolveAdminSeedPassword, seed } from '@api/seed'
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'

describe('resolveAdminSeedPassword', () => {
  it('rejects a missing password', () => {
    expect(() => resolveAdminSeedPassword({})).toThrow(/ADMIN_PASSWORD is required/)
  })

  it('rejects a whitespace-only password', () => {
    expect(() => resolveAdminSeedPassword({ ADMIN_PASSWORD: '   ' })).toThrow(/ADMIN_PASSWORD is required/)
  })

  it('rejects a short password', () => {
    expect(() => resolveAdminSeedPassword({ ADMIN_PASSWORD: 'short' })).toThrow(
      'Password must be at least 8 characters',
    )
  })

  it('returns an explicit password', () => {
    expect(resolveAdminSeedPassword({ ADMIN_PASSWORD: 'correct-horse' })).toBe('correct-horse')
  })

  it('preserves leading and trailing spaces', () => {
    expect(resolveAdminSeedPassword({ ADMIN_PASSWORD: '  correct-horse  ' })).toBe('  correct-horse  ')
  })
})

describe('resolveAdminSeedEmail', () => {
  it('defaults to the documented admin address', () => {
    expect(resolveAdminSeedEmail({})).toBe('admin@nuxt-app.com')
  })

  it('trims whitespace and lowercases', () => {
    expect(resolveAdminSeedEmail({ ADMIN_EMAIL: '  Admin@Nuxt-App.COM  ' })).toBe('admin@nuxt-app.com')
  })

  it('rejects a malformed email', () => {
    expect(() => resolveAdminSeedEmail({ ADMIN_EMAIL: 'not-an-email' })).toThrow('Invalid email')
  })
})

describe('seed', () => {
  it('does not create an admin when ADMIN_PASSWORD is unset', async () => {
    const email = `seed-${Date.now()}@nuxt-app.com`
    await expect(seed({ ADMIN_EMAIL: email, ADMIN_NAME: 'Admin' })).rejects.toThrow(
      /ADMIN_PASSWORD is required/,
    )

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    })
    expect(existing).toBeUndefined()
  })

  it('creates an admin when ADMIN_PASSWORD is set', async () => {
    const email = `seed-ok-${Date.now()}@nuxt-app.com`
    await seed({
      ADMIN_EMAIL: email,
      ADMIN_NAME: 'Admin',
      ADMIN_PASSWORD: 'unique-pass-99',
    })

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    })
    expect(existing?.role).toBe('admin')
    expect(existing?.name).toBe('Admin')
  })

  it('does not promote a pre-existing account when ADMIN_PASSWORD is unset', async () => {
    const email = `seed-pre-${Date.now()}@nuxt-app.com`
    await createUser({ email, password: 'attacker-pass', name: 'Pre' })

    await expect(seed({ ADMIN_EMAIL: email, ADMIN_NAME: 'Admin' })).rejects.toThrow(
      /ADMIN_PASSWORD is required/,
    )

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    })
    expect(existing?.role).toBe('user')
    expect(await verifyPassword('attacker-pass', existing!.passwordHash)).toBe(true)
  })

  it('resets the password and sessions when promoting a pre-existing account', async () => {
    const email = `seed-takeover-${Date.now()}@nuxt-app.com`
    const created = await createUser({ email, password: 'attacker-pass', name: 'Pre' })
    const row = await db.query.users.findFirst({
      where: eq(users.email, email),
    })
    const sessionId = await createSession(row!.id)
    expect(created?.role).toBe('user')
    expect(await getSessionUser(sessionId)).not.toBeNull()

    await seed({
      ADMIN_EMAIL: email,
      ADMIN_NAME: 'Admin',
      ADMIN_PASSWORD: 'operator-pass-99',
    })

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    })
    expect(existing?.role).toBe('admin')
    expect(await verifyPassword('attacker-pass', existing!.passwordHash)).toBe(false)
    expect(await verifyPassword('operator-pass-99', existing!.passwordHash)).toBe(true)
    expect(await getSessionUser(sessionId)).toBeNull()
  })

  it('finds an existing user when ADMIN_EMAIL differs only by case', async () => {
    const local = `seed-case-${Date.now()}`
    const email = `${local}@nuxt-app.com`
    await createUser({ email, password: 'attacker-pass', name: 'Pre' })

    await seed({
      ADMIN_EMAIL: `${local.toUpperCase()}@Nuxt-App.COM`,
      ADMIN_NAME: 'Admin',
      ADMIN_PASSWORD: 'operator-pass-99',
    })

    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    })
    expect(existing?.role).toBe('admin')
    expect(await verifyPassword('operator-pass-99', existing!.passwordHash)).toBe(true)
  })

  it('does not create an admin when ADMIN_EMAIL is malformed', async () => {
    await expect(seed({
      ADMIN_EMAIL: 'not-an-email',
      ADMIN_NAME: 'Admin',
      ADMIN_PASSWORD: 'unique-pass-99',
    })).rejects.toThrow('Invalid email')

    const existing = await db.query.users.findFirst({
      where: eq(users.email, 'not-an-email'),
    })
    expect(existing).toBeUndefined()
  })
})
