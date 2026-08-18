import type { AppEnv } from '@api/types.js'
import type { OpenAPIHono } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'

export const openApiConfig = {
  openapi: '3.1.0' as const,
  info: {
    title: 'nuxt-app API',
    version: '0.0.0',
    description: 'Local development reference. Session cookie: `nuxt_app_session`.',
  },
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Admin' },
  ],
}

export function configureOpenAPI(app: OpenAPIHono<AppEnv>) {
  app.openAPIRegistry.registerComponent('securitySchemes', 'sessionCookie', {
    type: 'apiKey',
    in: 'cookie',
    name: 'nuxt_app_session',
  })

  app.doc31('/openapi.json', openApiConfig)

  app.get('/docs', Scalar({
    url: '/openapi.json',
    pageTitle: 'nuxt-app API',
    theme: 'kepler',
  }))

  return app
}
