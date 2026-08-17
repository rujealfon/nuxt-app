import { API_PROXY_PREFIX } from './api-url'

/** CDN routes appended after Vercel's filesystem handle (no serverless function). */
export function vercelSpaFallbackRoutes(apiUrl: string) {
  const origin = apiUrl.replace(/\/$/, '')
  return [
    {
      src: `${API_PROXY_PREFIX}(?:/(.*))`,
      dest: `${origin}/$1`,
    },
    {
      src: '/(.*)',
      dest: '/index.html',
    },
  ]
}
