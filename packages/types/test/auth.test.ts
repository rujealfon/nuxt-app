import { describe, expect, it } from 'vitest'
import { loginSchema, registerSchema } from '../src/auth'

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
