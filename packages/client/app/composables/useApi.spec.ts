import { describe, expect, it } from 'vitest'
import { useApi } from './useApi'

describe('useApi', () => {
  it('scopes urls to the configured API version', () => {
    const { apiUrl } = useApi()

    expect(apiUrl('/hello')).toBe('http://api.test/api/v1/hello')
  })

  it('exposes a fetch client', () => {
    const { api } = useApi()

    expect(typeof api).toBe('function')
  })

  it('reuses one client for the same configuration', () => {
    expect(useApi().api).toBe(useApi().api)
  })

  it('reads the API error contract from a fetch failure', () => {
    const { parseApiError } = useApi()

    expect(parseApiError({
      data: {
        error: 'not_found',
        message: 'The requested resource was not found',
      },
    })).toEqual({
      error: 'not_found',
      message: 'The requested resource was not found',
    })
  })

  it('reads input details from an invalid_input fetch failure', () => {
    const { parseApiError } = useApi()

    expect(parseApiError({
      data: {
        error: 'invalid_input',
        message: 'The request was invalid',
        details: [{ path: ['email'], message: 'Enter a valid email address' }],
      },
    })).toEqual({
      error: 'invalid_input',
      message: 'The request was invalid',
      details: [{ path: ['email'], message: 'Enter a valid email address' }],
    })
  })

  it('returns null for a Better Auth failure body', () => {
    const { parseApiError } = useApi()

    expect(parseApiError({ data: { message: 'Invalid credentials' } })).toBeNull()
  })
})
