import { describe, expect, it } from 'vitest'
import { authRequestError } from './authError'

describe('authRequestError', () => {
  it('reads invalid_input details from the API error contract', () => {
    const error = authRequestError({
      error: 'invalid_input',
      message: 'The request was invalid',
      details: [
        { path: ['email'], message: 'Enter a valid email address' },
        { path: ['password'], message: 'Password is required' },
      ],
      status: 400,
      statusText: 'Bad Request',
    })

    expect(error.message).toBe('The request was invalid')
    expect(error.apiError?.error).toBe('invalid_input')
    expect(error.fieldErrors).toEqual([
      { name: 'email', message: 'Enter a valid email address' },
      { name: 'password', message: 'Password is required' },
    ])
  })

  it('drops a whole-body detail from the field errors', () => {
    const error = authRequestError({
      error: 'invalid_input',
      message: 'The request was invalid',
      details: [{ path: [], message: 'Invalid input: expected object, received null' }],
    })

    expect(error.fieldErrors).toEqual([])
    expect(error.message).toBe('The request was invalid')
  })

  it('has no field errors for a non-validation contract failure', () => {
    const error = authRequestError({
      error: 'unauthenticated',
      message: 'Invalid email or password',
    })

    expect(error.apiError?.error).toBe('unauthenticated')
    expect(error.fieldErrors).toEqual([])
  })

  it('falls back to the thrown message for a non-contract failure', () => {
    const error = authRequestError({ message: 'Network down' })

    expect(error.message).toBe('Network down')
    expect(error.apiError).toBeNull()
    expect(error.fieldErrors).toEqual([])
  })

  it('uses a safe default when there is no message', () => {
    expect(authRequestError(undefined).message).toBe('Unable to continue')
  })

  it('has no field errors when invalid_input carries no details', () => {
    const error = authRequestError({
      error: 'invalid_input',
      message: 'The request was invalid',
    })

    expect(error.fieldErrors).toEqual([])
  })
})
