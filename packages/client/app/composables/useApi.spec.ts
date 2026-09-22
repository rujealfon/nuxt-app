import { describe, expect, it } from 'vitest'
import { useApi, useApiFetch } from './useApi'

describe('useApi', () => {
  it('exposes a fetch client', () => {
    const { api } = useApi()

    expect(typeof api).toBe('function')
  })

  it('reuses one client for the same configuration', () => {
    expect(useApi().api).toBe(useApi().api)
  })

  it('exposes an SSR-aware fetch composable', () => {
    expect(typeof useApiFetch).toBe('function')
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
