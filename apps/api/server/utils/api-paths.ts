import type { H3Event } from 'h3'

// The docs endpoints: the Scalar shell, its OpenAPI document, and the
// self-hosted UI bundle. Kept in one place so the docs guard and the rate-limit
// exemption cannot drift apart.
export const DOCS_PATHS = ['/api/docs', '/api/openapi.json']
export const DOCS_PREFIXES = ['/api/docs/', '/api/docs-assets/']

export function isDocsPath(path: string): boolean {
  return DOCS_PATHS.includes(path)
    || DOCS_PREFIXES.some(prefix => path.startsWith(prefix))
}

// Request path without the query string. Middleware that routes on path alone
// shares this instead of each splitting on `?`.
export function requestPath(event: H3Event): string {
  const query = event.path.indexOf('?')

  return query === -1 ? event.path : event.path.slice(0, query)
}
