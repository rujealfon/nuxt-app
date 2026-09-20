import { parseOrigins } from '@nuxt-app/config'
import { useRuntimeConfig } from 'nitropack/runtime'
import { createAuth } from '../database/auth'
import { useDb } from './db'
import { createRateLimitStorage } from './rate-limit'

let instance: ReturnType<typeof createAuth> | undefined

function createInstance() {
  const config = useRuntimeConfig()

  return createAuth(useDb(), {
    secret: config.betterAuthSecret,
    baseURL: config.betterAuthUrl,
    trustedOrigins: parseOrigins(config.corsOrigins || ''),
    rateLimitStorage: createRateLimitStorage({ failClosed: true }),
  })
}

export function useAuth() {
  instance ??= createInstance()
  return instance
}
