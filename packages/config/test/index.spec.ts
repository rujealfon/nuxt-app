import { describe, expect, it } from 'vitest'
import { apiBaseFor, apiVersions, currentApiVersion, deprecatedApiVersions, versionMeta } from '../index'

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

  it('keeps the shared registry frozen', () => {
    expect(Object.isFrozen(deprecatedApiVersions)).toBe(true)
  })
})

describe('versionMeta', () => {
  it('marks a live version as not deprecated', () => {
    expect(versionMeta('v1')).toEqual({ version: 'v1', deprecated: false })
  })

  it('reports the sunset date from an explicit registry', () => {
    expect(versionMeta('v1', { v1: { sunset: '2026-12-31' } })).toEqual({
      version: 'v1',
      deprecated: true,
      sunset: '2026-12-31',
    })
  })
})
