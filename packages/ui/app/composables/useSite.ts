import type { SiteKey } from '@nuxt-app/config'
import { useRuntimeConfig } from '#imports'

interface SiteRuntimeConfig {
  appName: SiteKey
  webUrl: string
  appUrl: string
  adminUrl: string
}

export function useSite() {
  const config = useRuntimeConfig()
  const site = config.public as SiteRuntimeConfig

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
    linkTo,
  }
}
