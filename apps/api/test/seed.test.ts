import { db, users } from '@api/db'
import { resolveAdminSeedPassword, seed } from '@api/seed'
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
})
