import type { AppEnv } from '@api/types.js'
import { createFactory } from 'hono/factory'

export const factory = createFactory<AppEnv>()
