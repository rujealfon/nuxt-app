import type { Logger } from '@mysite/logger'
import { createLogger } from '@mysite/logger'

let logger: Logger | undefined

export function useLogger(): Logger {
  return (logger ??= createLogger({ name: 'api' }))
}
