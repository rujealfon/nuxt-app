// Development-only API docs. Scalar UI, its OpenAPI document, and the
// self-hosted UI bundle answer 404 in production builds. `import.meta.dev`
// is compile-time: there is no runtime env opt-in.
import { defineEventHandler } from 'h3'
import { isDocsPath, requestPath } from '../utils/api-paths'
import { domainFailure } from '../utils/domain-failure'

export default defineEventHandler((event) => {
  if (!isDocsPath(requestPath(event))) {
    return
  }

  if (!import.meta.dev) {
    throw domainFailure('not_found')
  }
})
