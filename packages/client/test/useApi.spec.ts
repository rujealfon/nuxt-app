import { describe, expect, it } from 'vitest'
import { useApi } from '../app/composables/useApi'

describe('useApi', () => {
  it('scopes urls to the configured API version', () => {
    const { apiUrl } = useApi()

    expect(apiUrl('/hello')).toBe('http://api.test/api/v1/hello')
  })

  it('exposes a fetch client', () => {
    const { api } = useApi()

    expect(typeof api).toBe('function')
  })
})
