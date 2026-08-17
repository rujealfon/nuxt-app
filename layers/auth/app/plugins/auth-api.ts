import { resolveAuthApiBase, setAuthApiUrl } from '@nuxt-app/auth'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const apiUrl = String(config.public.apiUrl || '')
  if (!apiUrl)
    return
  const pageHref = import.meta.client ? window.location.href : undefined
  setAuthApiUrl(resolveAuthApiBase(apiUrl, pageHref))
})
