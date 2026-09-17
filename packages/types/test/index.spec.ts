import { describe, expect, it } from 'vitest'
import { actorFromSession, actorSchema, loginSchema, parseActor, productErrorSchema, registerSchema, v1 } from '../src'

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

describe('product error contract', () => {
  it('accepts a known code', () => {
    expect(productErrorSchema.safeParse({ error: 'not_found', message: 'Gone' }).success).toBe(true)
  })

  it('rejects an unknown code', () => {
    expect(productErrorSchema.safeParse({ error: 'teapot', message: 'Nope' }).success).toBe(false)
  })
})

describe('actor contract', () => {
  it('accepts a complete actor', () => {
    expect(actorSchema.safeParse({ id: 'u1', email: 'admin@example.com', name: null, role: 'admin' }).success).toBe(true)
  })

  it('defaults an unknown role to user', () => {
    expect(actorSchema.parse({ id: 'u1', email: 'user@example.com', name: null, role: 'owner' })).toMatchObject({ role: 'user' })
  })

  it('rejects a missing id', () => {
    expect(actorSchema.safeParse({ email: 'user@example.com', role: 'user' }).success).toBe(false)
  })

  it('parses a session user through parseActor', () => {
    expect(parseActor({ id: 'u1', email: 'user@example.com', name: null, role: 'admin' })).toEqual({
      id: 'u1',
      email: 'user@example.com',
      name: null,
      role: 'admin',
    })
  })

  it('returns null from parseActor when the user is not an actor', () => {
    expect(parseActor({ email: 'user@example.com', role: 'user' })).toBeNull()
  })

  it('reads the actor from a session envelope', () => {
    expect(actorFromSession({
      user: { id: 'u1', email: 'user@example.com', name: null, role: 'user' },
    })).toMatchObject({ id: 'u1', role: 'user' })
  })

  it('returns null without a session envelope', () => {
    expect(actorFromSession(null)).toBeNull()
  })
})
