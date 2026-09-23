import { describe, expect, it } from 'vitest'
import { apiBaseFor, apiVersions, appPorts, authMount, currentApiVersion, defaultSessionTransport, deprecatedApiVersions, isBearerTransport, parseOrigins, sessionEndpoint, sessionTokenHeader, sessionTransportFor, siteUrls, versionedOperations, versionMeta } from '../index'

describe('apiBaseFor', () => {
  it('falls back to the local API port', () => {
    expect(apiBaseFor(undefined)).toBe('http://localhost:3003')
  })

  it('returns the provided base unchanged', () => {
    expect(apiBaseFor('https://api.nuxt-app.com')).toBe('https://api.nuxt-app.com')
  })
})

describe('sessionTransportFor', () => {
  it('defaults to cookies', () => {
    expect(sessionTransportFor(undefined)).toBe(defaultSessionTransport)
    expect(sessionTransportFor('')).toBe(defaultSessionTransport)
  })

  it('selects bearer only for the exact value', () => {
    expect(sessionTransportFor('bearer')).toBe('bearer')
    // A typo must not silently switch transports.
    expect(sessionTransportFor('Bearer')).toBe(defaultSessionTransport)
    expect(sessionTransportFor('token')).toBe(defaultSessionTransport)
  })
})

describe('isBearerTransport', () => {
  it('recognizes only the bearer transport', () => {
    expect(isBearerTransport('bearer')).toBe(true)
    expect(isBearerTransport('cookie')).toBe(false)
    expect(isBearerTransport(undefined)).toBe(false)
    expect(isBearerTransport('Bearer')).toBe(false)
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

  it('registers the operations of every version', () => {
    for (const version of apiVersions) {
      expect(versionedOperations[version]).toBeDefined()
    }

    expect(versionedOperations.v1.map(operation => operation.suffix)).toContain('/hello')
  })
})

describe('session transport constants', () => {
  it('shares the token header, session endpoint, and auth mount with both sides', () => {
    expect(sessionTokenHeader).toBe('set-auth-token')
    expect(sessionEndpoint).toBe('/get-session')
    expect(authMount).toBe('/api/auth')
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
