import { apiVersions, currentApiVersion } from '@mysite/config'

export default defineEventHandler(() => {
  return {
    current: currentApiVersion,
    versions: apiVersions.map(version => versionMeta(version)),
  }
})
