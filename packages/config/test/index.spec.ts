import { describe, expect, it } from 'vitest'
import { apiBaseFor, apiVersions, currentApiVersion, deprecatedApiVersions } from '../index'

describe('apiBaseFor', () => {
  it('falls back to the local API port', () => {
    expect(apiBaseFor(undefined)).toBe('http://localhost:3003')
  })

  it('returns the provided base unchanged', () => {
    expect(apiBaseFor('https://api.nuxt-app.com')).toBe('https://api.nuxt-app.com')
  })
})

describe('api version registry', () => {
  it('treats v1 as the current version', () => {
    expect(apiVersions).toContain('v1')
    expect(currentApiVersion).toBe('v1')
  })

  it('only records deprecations for known versions', () => {
    for (const version of Object.keys(deprecatedApiVersions)) {
      expect(apiVersions).toContain(version)
    }
  })
})
