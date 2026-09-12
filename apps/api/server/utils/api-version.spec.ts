import { deprecatedApiVersions } from '@mysite/config'
import { describe, expect, it } from 'vitest'
import { isApiVersion, versionMeta } from './api-version'

describe('isApiVersion', () => {
  it('accepts known versions', () => {
    expect(isApiVersion('v1')).toBe(true)
  })

  it('rejects unknown versions', () => {
    expect(isApiVersion('v9')).toBe(false)
  })
})

describe('versionMeta', () => {
  it('marks a live version as not deprecated', () => {
    delete deprecatedApiVersions.v1

    expect(versionMeta('v1')).toEqual({ version: 'v1', deprecated: false })
  })

  it('reports the sunset date for a deprecated version', () => {
    deprecatedApiVersions.v1 = { sunset: '2026-12-31' }

    try {
      expect(versionMeta('v1')).toEqual({
        version: 'v1',
        deprecated: true,
        sunset: '2026-12-31',
      })
    }
    finally {
      delete deprecatedApiVersions.v1
    }
  })
})
