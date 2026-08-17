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
