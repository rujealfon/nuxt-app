import { describe, expect, it } from 'vitest'
import { loginSchema, registerSchema, v1 } from '../src'

describe('auth schemas', () => {
  it('accepts valid login credentials', () => {
    expect(loginSchema.safeParse({ email: 'user@example.com', password: 'x' }).success).toBe(true)
  })

  it('rejects an invalid email', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(false)
  })

  it('requires an 8+ character password on register', () => {
    expect(registerSchema.safeParse({ name: 'A', email: 'user@example.com', password: 'short' }).success).toBe(false)
    expect(registerSchema.safeParse({ name: 'A', email: 'user@example.com', password: 'longenough' }).success).toBe(true)
  })
})

describe('v1 contracts', () => {
  it('parses a hello response', () => {
    expect(v1.helloResponseSchema.parse({ message: 'hi' })).toEqual({ message: 'hi' })
  })

  it('rejects a response without a message', () => {
    expect(v1.helloResponseSchema.safeParse({}).success).toBe(false)
  })
})
