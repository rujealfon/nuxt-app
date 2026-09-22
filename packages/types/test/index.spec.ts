import { describe, expect, it } from 'vitest'
import { actorFromSession, actorSchema, apiError, apiErrorMessages, apiErrorSchema, loginSchema, parseApiError, registerSchema, v1 } from '../src'

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

describe('aPI error contract', () => {
  it('accepts a known code', () => {
    expect(apiErrorSchema.safeParse({ error: 'not_found', message: 'Gone' }).success).toBe(true)
  })

  it('rejects an unknown code', () => {
    expect(apiErrorSchema.safeParse({ error: 'teapot', message: 'Nope' }).success).toBe(false)
  })

  it('rejects an empty message', () => {
    expect(apiErrorSchema.safeParse({ error: 'not_found', message: '' }).success).toBe(false)
  })

  it('accepts input details on invalid_input', () => {
    expect(apiErrorSchema.parse({
      error: 'invalid_input',
      message: 'The request was invalid',
      details: [{ path: ['email'], message: 'Enter a valid email address' }],
    })).toEqual({
      error: 'invalid_input',
      message: 'The request was invalid',
      details: [{ path: ['email'], message: 'Enter a valid email address' }],
    })
  })

  it('accepts an empty path as the whole body', () => {
    expect(apiErrorSchema.parse({
      error: 'invalid_input',
      message: 'The request was invalid',
      details: [{ path: [], message: 'The request was invalid' }],
    }).details).toEqual([{ path: [], message: 'The request was invalid' }])
  })

  it('rejects an empty details list', () => {
    expect(apiErrorSchema.safeParse({
      error: 'invalid_input',
      message: 'The request was invalid',
      details: [],
    }).success).toBe(false)
  })

  it('rejects an empty detail message', () => {
    expect(apiErrorSchema.safeParse({
      error: 'invalid_input',
      message: 'The request was invalid',
      details: [{ path: ['email'], message: '' }],
    }).success).toBe(false)
  })

  it('rejects input details on a code other than invalid_input', () => {
    expect(apiErrorSchema.safeParse({
      error: 'not_found',
      message: 'Gone',
      details: [{ path: ['id'], message: 'Missing' }],
    }).success).toBe(false)
  })

  it('parses an API error contract through parseApiError', () => {
    expect(parseApiError({
      error: 'not_found',
      message: 'The requested resource was not found',
    })).toEqual({
      error: 'not_found',
      message: 'The requested resource was not found',
    })
  })

  it('returns null from parseApiError when the body is not the contract', () => {
    expect(parseApiError({ message: 'Invalid credentials' })).toBeNull()
    expect(parseApiError(null)).toBeNull()
  })

  it('builds a contract body through apiError', () => {
    expect(apiError('not_found')).toEqual({
      error: 'not_found',
      message: apiErrorMessages.not_found,
    })
  })

  it('drops input details on a code other than invalid_input', () => {
    expect(apiError('not_found', undefined, [
      { path: ['id'], message: 'Missing' },
    ])).toEqual({
      error: 'not_found',
      message: apiErrorMessages.not_found,
    })
  })

  it('omits unusable input details', () => {
    expect(apiError('invalid_input', undefined, [
      { path: ['email'], message: '' },
    ])).toEqual({
      error: 'invalid_input',
      message: apiErrorMessages.invalid_input,
    })
  })

  it('substitutes an empty message with the canned copy', () => {
    expect(apiError('forbidden', '')).toEqual({
      error: 'forbidden',
      message: apiErrorMessages.forbidden,
    })
  })

  it('falls back to internal_error when the constructor drifts', () => {
    expect(apiError('teapot' as never)).toEqual({
      error: 'internal_error',
      message: apiErrorMessages.internal_error,
    })
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

  it('reads the actor from a session envelope', () => {
    expect(actorFromSession({
      user: { id: 'u1', email: 'user@example.com', name: null, role: 'user' },
    })).toMatchObject({ id: 'u1', role: 'user' })
  })

  it('returns null without a session envelope', () => {
    expect(actorFromSession(null)).toBeNull()
  })
})
