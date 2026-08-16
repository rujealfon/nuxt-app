import { setAuthApiUrl } from '@nuxt-app/auth/client'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  if (config.public.apiUrl)
    setAuthApiUrl(config.public.apiUrl as string)
})
