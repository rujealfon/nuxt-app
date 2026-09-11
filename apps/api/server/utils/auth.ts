import { createAuth } from '../database/auth'

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
  })
}

export function useAuth() {
  instance ??= createInstance()
  return instance
}
