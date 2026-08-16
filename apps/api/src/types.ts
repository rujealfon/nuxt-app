import type { AuthUser } from '@nuxt-app/types'

export interface AppEnv {
  Variables: {
    user: AuthUser | null
  }
}
