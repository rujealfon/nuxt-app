import { apiVersions, currentApiVersion, versionMeta } from '@nuxt-app/config'
import { defineEventHandler } from 'h3'
import { versionRegistrySchema } from '../utils/infra'

export default defineEventHandler(() => {
  return versionRegistrySchema.parse({
    current: currentApiVersion,
    versions: apiVersions.map(version => versionMeta(version)),
  })
})
