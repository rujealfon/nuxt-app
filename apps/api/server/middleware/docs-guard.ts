// Development-only API docs. Scalar UI, its OpenAPI document, and the
// self-hosted UI bundle answer 404 in production builds unless DOCS_ENABLED
// is set (contract tests run prod builds with it enabled). Runs before routes
// and static assets so the bundle cannot leak the docs surface on its own.
const DOCS_PATHS = ['/api/docs', '/api/openapi.json']
const DOCS_PREFIXES = ['/api/docs/', '/api/docs-assets/']

export default defineEventHandler((event) => {
  const path = event.path.split('?')[0] ?? '/'

  const isDocs = DOCS_PATHS.includes(path)
    || DOCS_PREFIXES.some(prefix => path.startsWith(prefix))

  if (!isDocs) {
    return
  }

  const config = useRuntimeConfig(event)

  if (!config.docsEnabled) {
    throw productFailure('not_found')
  }
})
