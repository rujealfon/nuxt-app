// Development-only API docs. Scalar UI, its OpenAPI document, and the
// self-hosted UI bundle answer 404 in production builds unless DOCS_ENABLED
// is set (contract tests run prod builds with it enabled). Runs before routes
// and static assets so the bundle cannot leak the docs surface on its own.
import { defineEventHandler } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'
import { isDocsPath, requestPath } from '../utils/api-paths'
import { domainFailure } from '../utils/domain-failure'

export default defineEventHandler((event) => {
  if (!isDocsPath(requestPath(event))) {
    return
  }

  const config = useRuntimeConfig(event)

  if (!config.docsEnabled) {
    throw domainFailure('not_found')
  }
})
