import { describe, expect, it } from 'vitest'
import { isDocsPath, requestPath } from './api-paths'

describe('requestPath', () => {
  it('strips the query string', () => {
    expect(requestPath({ path: '/api/v1/hello?foo=bar' } as never)).toBe('/api/v1/hello')
  })

  it('returns a path without a query string unchanged', () => {
    expect(requestPath({ path: '/api/health' } as never)).toBe('/api/health')
  })
})

describe('isDocsPath', () => {
  it.each([
    '/api/docs',
    '/api/openapi.json',
    '/api/docs/unknown',
    '/api/docs-assets/standalone.js',
  ])('matches %s', (path) => {
    expect(isDocsPath(path)).toBe(true)
  })

  it.each([
    '/api/health',
    '/api/v1/hello',
    '/api',
  ])('rejects %s', (path) => {
    expect(isDocsPath(path)).toBe(false)
  })
})
