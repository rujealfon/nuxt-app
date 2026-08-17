import type { AppEnv } from '@api/types.js'
import { OpenAPIHono } from '@hono/zod-openapi'
import { createFactory } from 'hono/factory'
import defaultHook from 'stoker/openapi/default-hook'

export const factory = createFactory<AppEnv>()

export function createRouter() {
  return new OpenAPIHono<AppEnv>({
    strict: false,
    defaultHook,
  })
}
