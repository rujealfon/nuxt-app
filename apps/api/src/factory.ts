import type { AppEnv } from '@api/types.js'
import { OpenAPIHono } from '@hono/zod-openapi'
import { createFactory } from 'hono/factory'

export const factory = createFactory<AppEnv>()

export function createRouter() {
  return new OpenAPIHono<AppEnv>({
    strict: false,
    defaultHook(result, c) {
      if (!result.success) {
        const message = result.error.issues[0]?.message ?? 'Invalid request'
        return c.json({ error: message }, 400)
      }
    },
  })
}
