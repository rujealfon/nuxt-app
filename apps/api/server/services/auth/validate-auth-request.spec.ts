import { describe, expect, it } from 'vitest'
import { isPasswordFlowPath, validateAuthRequest } from './validate-auth-request'

describe('isPasswordFlowPath', () => {
  it.each([
    '/api/auth/sign-up/email',
    '/api/auth/sign-in/email',
  ])('recognises %s', (path) => {
    expect(isPasswordFlowPath(path)).toBe(true)
  })

  it.each([
    '/api/auth/sign-out',
    '/api/auth/get-session',
    '/api/auth/other/sign-up/email',
    '/sign-up/email',
  ])('ignores %s', (path) => {
    expect(isPasswordFlowPath(path)).toBe(false)
  })
})

describe('validateAuthRequest', () => {
  it('accepts a valid registration body', () => {
    const result = validateAuthRequest('/api/auth/sign-up/email', {
      name: 'Ada',
      email: 'ada@example.com',
      password: 'longenough',
    })

    expect(result).toBeUndefined()
  })

  it('rejects a registration body with field details', () => {
    const result = validateAuthRequest('/api/auth/sign-up/email', {
      name: '',
      email: 'not-an-email',
      password: 'short',
    })

    expect(result?.error).toBe('invalid_input')
    expect(result?.details).toEqual([
      { path: ['name'], message: 'Name is required' },
      { path: ['email'], message: 'Enter a valid email address' },
      { path: ['password'], message: 'Password must be at least 8 characters' },
    ])
  })

  it('uses the sign-in schema for sign-in', () => {
    // `loginSchema` allows a one-character password; register would not.
    expect(validateAuthRequest('/api/auth/sign-in/email', {
      email: 'ada@example.com',
      password: 'x',
    })).toBeUndefined()

    expect(validateAuthRequest('/api/auth/sign-in/email', {
      email: 'nope',
      password: 'x',
    })?.details).toEqual([
      { path: ['email'], message: 'Enter a valid email address' },
    ])
  })

  it('ignores paths outside the password flows', () => {
    expect(validateAuthRequest('/api/auth/get-session', {})).toBeUndefined()
  })
})
