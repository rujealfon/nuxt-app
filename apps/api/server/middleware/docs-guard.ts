// Development-only API docs. Scalar UI, its OpenAPI document, and the
// self-hosted UI bundle answer 404 in production builds. `import.meta.dev`
// is compile-time: there is no runtime env opt-in.
import { defineEventHandler } from 'h3'
import { isDocsPath, requestPath } from '../utils/api-paths'
import { domainFailure } from '../utils/domain-failure'

// Takes the compile-time `import.meta.dev` flag so specs can exercise both the
// development passthrough and the production 404.
export function createDocsGuard(dev: boolean) {
  return defineEventHandler((event) => {
    if (!isDocsPath(requestPath(event))) {
      return
    }

    if (!dev) {
      throw domainFailure('not_found')
    }
  })
}

export default createDocsGuard(import.meta.dev)
