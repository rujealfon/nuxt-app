/** Same-origin prefix Nitro proxies to `NUXT_PUBLIC_API_URL`. */
export const API_PROXY_PREFIX = '/__api'

/** `*.vercel.app` (including the bare apex) is a public-suffix host — a distinct site per deployment. */
export function isVercelPreviewHost(hostname: string): boolean {
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
    if (isVercelPreviewHost(api.hostname) || isVercelPreviewHost(page.hostname))
      return API_PROXY_PREFIX
  }
  catch {
    return apiUrl
  }

  return apiUrl
}
