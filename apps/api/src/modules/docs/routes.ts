import { factory } from '@api/factory.js'
import { openApiDocument } from '@api/modules/docs/openapi.js'
import { Scalar } from '@scalar/hono-api-reference'

export const docsRoutes = factory.createApp()
  .get('/openapi.json', c => c.json(openApiDocument))
  .get('/', Scalar({
    url: '/openapi.json',
    pageTitle: 'nuxt-app API',
    theme: 'kepler',
  }))
