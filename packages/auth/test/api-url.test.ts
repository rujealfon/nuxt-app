import { describe, expect, it } from 'vitest'
import { API_PROXY_PREFIX, resolveAuthApiBase } from '../src/api-url'

describe('resolveAuthApiBase', () => {
  it('keeps a same-origin API URL', () => {
    expect(resolveAuthApiBase(
      'https://app-preview.vercel.app',
      'https://app-preview.vercel.app/login',
    )).toBe('https://app-preview.vercel.app')
  })

  it('uses the same-origin proxy between distinct vercel.app hosts', () => {
    expect(resolveAuthApiBase(
      'https://nuxt-app-api-git-feat.vercel.app',
      'https://nuxt-app-app-git-feat.vercel.app/login',
    )).toBe(API_PROXY_PREFIX)
  })

  it('uses the proxy when a vercel.app page calls a custom API host', () => {
    expect(resolveAuthApiBase(
      'https://api.nuxt-app.com',
      'https://nuxt-app-app-git-feat.vercel.app/login',
    )).toBe(API_PROXY_PREFIX)
  })

  it('keeps sibling custom domains so COOKIE_DOMAIN can share the session', () => {
    expect(resolveAuthApiBase(
      'https://api.nuxt-app.com',
      'https://app.nuxt-app.com/login',
    )).toBe('https://api.nuxt-app.com')
  })

  it('keeps local host ports (same-site)', () => {
    expect(resolveAuthApiBase(
      'http://localhost:3001',
      'http://localhost:3000/login',
    )).toBe('http://localhost:3001')
  })

  it('returns the configured URL when no page location is available', () => {
    expect(resolveAuthApiBase('https://api.nuxt-app.com')).toBe('https://api.nuxt-app.com')
  })
})
