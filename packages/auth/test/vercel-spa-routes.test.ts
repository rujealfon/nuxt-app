import { describe, expect, it } from 'vitest'
import { API_PROXY_PREFIX } from '../src/api-url'
import { vercelSpaFallbackRoutes } from '../src/vercel-spa-routes'

describe('vercelSpaFallbackRoutes', () => {
  it('proxies /__api to the API origin before the SPA fallback', () => {
    const routes = vercelSpaFallbackRoutes('https://api.example.com/')
    expect(routes[0]).toEqual({
      src: `${API_PROXY_PREFIX}(?:/(.*))`,
      dest: 'https://api.example.com/$1',
    })
    expect(routes[1]).toEqual({
      src: '/(.*)',
      dest: '/index.html',
    })
  })
})
