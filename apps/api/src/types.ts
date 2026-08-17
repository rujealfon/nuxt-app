import type { AuthUser } from '@nuxt-app/types'
import type { PinoLogger } from 'hono-pino'

export interface AppEnv {
  Variables: {
    user: AuthUser | null
    logger: PinoLogger
  }
}
