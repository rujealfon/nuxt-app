import { apiErrorMessages } from '@nuxt-app/types'
import { describe, expect, it } from 'vitest'
import { authFailureFromResponse } from './auth-error-contract'

describe('authFailureFromResponse', () => {
  it('maps a validation error onto invalid_input with its message', () => {
    const failure = authFailureFromResponse(400, {
      message: '[body.email] Invalid email address',
      code: 'VALIDATION_ERROR',
    })

    expect(failure.error).toBe('invalid_input')
    expect(failure.message).toBe('[body.email] Invalid email address')
  })

  it('maps invalid credentials onto unauthenticated', () => {
    const failure = authFailureFromResponse(401, {
      message: 'Invalid email or password',
      code: 'INVALID_EMAIL_OR_PASSWORD',
    })

    expect(failure.error).toBe('unauthenticated')
    expect(failure.message).toBe('Invalid email or password')
  })

  it('maps an existing user onto conflict', () => {
    const failure = authFailureFromResponse(422, {
      message: 'User already exists. Use another email.',
      code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
    })

    expect(failure.error).toBe('conflict')
  })

  it('maps a failed write onto internal_error with the canned message', () => {
    const failure = authFailureFromResponse(422, {
      message: 'Failed to create user',
      code: 'FAILED_TO_CREATE_USER',
    })

    expect(failure.error).toBe('internal_error')
    expect(failure.message).toBe(apiErrorMessages.internal_error)
  })

  it('maps the rate-limit response, which carries no code', () => {
    const failure = authFailureFromResponse(429, {
      message: 'Too many requests. Please try again later.',
    })

    expect(failure.error).toBe('rate_limited')
    expect(failure.message).toBe('Too many requests. Please try again later.')
  })

  it('conceals an unknown 5xx message as internal_error', () => {
    const failure = authFailureFromResponse(500, { message: 'database exploded' })

    expect(failure.error).toBe('internal_error')
    expect(failure.message).toBe(apiErrorMessages.internal_error)
  })

  it('maps an unknown 4xx onto not_found', () => {
    expect(authFailureFromResponse(418, {}).error).toBe('not_found')
  })

  // Better Auth answers 422 for both conflicts and failed writes; only a known
  // `code` makes it a conflict. An unclassified 422 conceals as `not_found`,
  // the same rule the error adapter applies to H3 errors.
  it('conceals an unclassified 422 as not_found', () => {
    expect(authFailureFromResponse(422, { message: 'nope' }).error).toBe('not_found')
  })

  it('falls back to the status when there is no body', () => {
    const failure = authFailureFromResponse(404, undefined)

    expect(failure.error).toBe('not_found')
    expect(failure.message).toBe(apiErrorMessages.not_found)
  })
})
