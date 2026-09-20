import { createAuth } from '../database/auth'
import { createRateLimitStorage } from './rate-limit'

let instance: ReturnType<typeof createAuth> | undefined

function createInstance() {
  const config = useRuntimeConfig()

  return createAuth(useDb(), {
    secret: config.betterAuthSecret,
    baseURL: config.betterAuthUrl,
    trustedOrigins: (config.corsOrigins || '')
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean),
    rateLimitStorage: createRateLimitStorage({ failClosed: true }),
  })
}

export function useAuth() {
  instance ??= createInstance()
  return instance
}
