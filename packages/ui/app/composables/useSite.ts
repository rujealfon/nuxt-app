export type SiteKey = 'web' | 'app' | 'admin'

interface SiteRuntimeConfig {
  appName: SiteKey
  webUrl: string
  appUrl: string
  adminUrl: string
  apiBase: string
}

export function useSite() {
  const config = useRuntimeConfig()
  const site = config.public as unknown as SiteRuntimeConfig

  const urls: Record<SiteKey, string> = {
    web: site.webUrl,
    app: site.appUrl,
    admin: site.adminUrl,
  }

  function linkTo(key: SiteKey): string {
    return urls[key]
  }

  return {
    currentApp: site.appName,
    apiBase: site.apiBase,
    urls,
    linkTo,
  }
}
