/** Same-origin prefix Nitro proxies to `NUXT_PUBLIC_API_URL`. */
export const API_PROXY_PREFIX = '/__api'

function isVercelAppHost(hostname: string) {
  return hostname === 'vercel.app' || hostname.endsWith('.vercel.app')
}

/**
 * `*.vercel.app` hosts are distinct sites (public suffix). Call the API through
 * a same-origin proxy there so the session cookie is first-party.
 */
export function resolveAuthApiBase(apiUrl: string, pageHref?: string): string {
  if (!pageHref)
    return apiUrl

  try {
    const api = new URL(apiUrl)
    const page = new URL(pageHref)
    if (api.origin === page.origin)
      return apiUrl
    if (isVercelAppHost(api.hostname) || isVercelAppHost(page.hostname))
      return API_PROXY_PREFIX
  }
  catch {
    return apiUrl
  }

  return apiUrl
}
