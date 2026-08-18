import { describe, expect, it } from 'vitest'
import {
  authUserSchema,
  loginSchema,
  matchesRequiredRole,
  parsePublicUrl,
  registerSchema,
  userRoleSchema,
} from '../src/auth'

describe('loginSchema', () => {
  it('accepts email and password', () => {
    expect(loginSchema.parse({
      email: 'ada@example.com',
      password: 'secret',
    })).toEqual({
      email: 'ada@example.com',
      password: 'secret',
    })
  })

  it('accepts an optional requireRole', () => {
    expect(loginSchema.parse({
      email: 'ada@example.com',
      password: 'secret',
      requireRole: 'admin',
    })).toEqual({
      email: 'ada@example.com',
      password: 'secret',
      requireRole: 'admin',
    })
  })

  it('rejects a missing email and password', () => {
    const result = loginSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.error.issues[0]?.message).toBe('Email and password are required')
  })

  it('rejects a malformed email', () => {
    const result = loginSchema.safeParse({
      email: 'x',
      password: 'secret',
    })
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.error.issues[0]?.message).toBe('Invalid email')
  })

  it('accepts a 72-byte password', () => {
    const password = 'a'.repeat(72)
    expect(loginSchema.parse({
      email: 'ada@example.com',
      password,
    }).password).toBe(password)
  })

  it('rejects a password longer than 72 UTF-8 bytes', () => {
    const result = loginSchema.safeParse({
      email: 'ada@example.com',
      password: 'a'.repeat(73),
    })
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.error.issues[0]?.message).toBe('Password must be at most 72 bytes')
  })
})

describe('registerSchema', () => {
  it('accepts name, email, and an 8+ character password', () => {
    expect(registerSchema.parse({
      email: 'ada@example.com',
      password: 'password12',
      name: 'Ada',
    })).toEqual({
      email: 'ada@example.com',
      password: 'password12',
      name: 'Ada',
    })
  })

  it('rejects a short password', () => {
    const result = registerSchema.safeParse({
      email: 'ada@example.com',
      password: 'short',
      name: 'Ada',
    })
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.error.issues[0]?.message).toBe('Password must be at least 8 characters')
  })

  it('accepts a 72-byte password', () => {
    const password = 'a'.repeat(72)
    expect(registerSchema.parse({
      email: 'ada@example.com',
      password,
      name: 'Ada',
    }).password).toBe(password)
  })

  it('rejects a password longer than 72 UTF-8 bytes', () => {
    const result = registerSchema.safeParse({
      email: 'ada@example.com',
      password: 'a'.repeat(73),
      name: 'Ada',
    })
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.error.issues[0]?.message).toBe('Password must be at most 72 bytes')
  })

  it('rejects a password whose UTF-8 encoding exceeds 72 bytes', () => {
    // 24 snowmen × 3 bytes = 72; one more exceeds bcrypt's limit under 72 characters
    const result = registerSchema.safeParse({
      email: 'ada@example.com',
      password: `${'☃'.repeat(24)}!`,
      name: 'Ada',
    })
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.error.issues[0]?.message).toBe('Password must be at most 72 bytes')
  })

  it('rejects a missing name', () => {
    const result = registerSchema.safeParse({
      email: 'ada@example.com',
      password: 'password12',
    })
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.error.issues[0]?.message).toBe('Email, password and name are required')
  })

  it('rejects a malformed email', () => {
    const result = registerSchema.safeParse({
      email: 'x',
      password: 'password12',
      name: 'Ada',
    })
    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.error.issues[0]?.message).toBe('Invalid email')
  })
})

describe('authUserSchema', () => {
  const user = {
    id: 'V1StGXR8_Z5jdHi6B-myT',
    email: 'ada@example.com',
    name: 'Ada',
    role: 'user' as const,
  }

  it('accepts a public user', () => {
    expect(authUserSchema.parse(user)).toEqual(user)
  })

  it('rejects a uuid pk as id', () => {
    const result = authUserSchema.safeParse({
      ...user,
      id: '01936c5a-7c3a-7c3a-8c3a-7c3a7c3a7c3a',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown role', () => {
    expect(userRoleSchema.safeParse('superuser').success).toBe(false)
    expect(authUserSchema.safeParse({ ...user, role: 'nope' }).success).toBe(false)
  })

  it('rejects a malformed email', () => {
    expect(authUserSchema.safeParse({ ...user, email: 'not-an-email' }).success).toBe(false)
  })
})

describe('matchesRequiredRole', () => {
  const user = { id: 'u1', email: 'a@b.c', name: 'Ada', role: 'user' as const }
  const admin = { ...user, role: 'admin' as const }

  it('allows any role when none is required', () => {
    expect(matchesRequiredRole(user)).toBe(true)
    expect(matchesRequiredRole(admin)).toBe(true)
  })

  it('requires an exact role match', () => {
    expect(matchesRequiredRole(user, 'admin')).toBe(false)
    expect(matchesRequiredRole(admin, 'admin')).toBe(true)
  })
})

describe('parsePublicUrl', () => {
  it('uses the fallback and strips a trailing slash', () => {
    expect(parsePublicUrl(undefined, 'http://localhost:3001/')).toBe('http://localhost:3001')
  })

  it('rejects a malformed URL', () => {
    expect(() => parsePublicUrl('not-a-url', 'http://localhost:3001')).toThrow()
  })
})
