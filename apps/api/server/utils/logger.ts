import type { Logger } from '@nuxt-app/logger'
import { createLogger } from '@nuxt-app/logger'

let logger: Logger | undefined

export function useLogger(): Logger {
  return (logger ??= createLogger({ name: 'api' }))
}
