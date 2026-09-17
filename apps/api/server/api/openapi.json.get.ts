// OpenAPI 3.1 document backing the Scalar UI at `/api/docs`. Unversioned
// infra route like `/api/health`, and development-only behind the docs guard.
export default defineEventHandler(() => {
  return buildOpenApiDocument()
})
