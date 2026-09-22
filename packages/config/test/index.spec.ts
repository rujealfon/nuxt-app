import { describe, expect, it } from 'vitest'
import { apiBaseFor, apiVersions, appPorts, authModeFor, currentApiVersion, deprecatedApiVersions, parseOrigins, siteUrls, versionMeta } from '../index'

describe('apiBaseFor', () => {
  it('falls back to the local API port', () => {
    expect(apiBaseFor(undefined)).toBe('http://localhost:3003')
  })

  it('returns the provided base unchanged', () => {
    expect(apiBaseFor('https://api.nuxt-app.com')).toBe('https://api.nuxt-app.com')
  })
})

describe('authModeFor', () => {
  it('defaults to cookies', () => {
    expect(authModeFor(undefined)).toBe('cookie')
    expect(authModeFor('')).toBe('cookie')
  })

  it('selects bearer only for the exact value', () => {
    expect(authModeFor('bearer')).toBe('bearer')
    // A typo must not silently switch transports.
    expect(authModeFor('Bearer')).toBe('cookie')
    expect(authModeFor('token')).toBe('cookie')
  })
})

describe('site registry', () => {
  it('derives app ports from the registry', () => {
    expect(appPorts).toEqual({ web: 3000, app: 3001, admin: 3002, api: 3003 })
  })

  it('derives localhost cross-site urls', () => {
    expect(siteUrls).toEqual({
      webUrl: 'http://localhost:3000',
      appUrl: 'http://localhost:3001',
      adminUrl: 'http://localhost:3002',
    })
  })
})

describe('parseOrigins', () => {
  it('defaults an empty value to the local site table', () => {
    expect(parseOrigins('')).toEqual(Object.values(siteUrls))
    expect(parseOrigins('  ')).toEqual(Object.values(siteUrls))
  })

  it('splits a configured list', () => {
    expect(parseOrigins('https://app.example.com, https://admin.example.com')).toEqual([
      'https://app.example.com',
      'https://admin.example.com',
    ])
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
