import type { AppEnv } from './types.js'
import { createFactory } from 'hono/factory'

export const factory = createFactory<AppEnv>()
