import { apiVersions, currentApiVersion } from '@nuxt-app/config'

export default defineEventHandler(() => {
  return {
    current: currentApiVersion,
    versions: apiVersions.map(version => versionMeta(version)),
  }
})
