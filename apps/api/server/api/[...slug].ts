// Strict 404 for any `/api/*` path without a matching route. Versioned routes
// live under `/api/v1/*`; infra routes (`/api/auth`, `/api/health`, `/api/docs`,
// `/api/openapi.json`) match static routes and take precedence over this
// catch-all. The error adapter renders the thrown failure as the API error
// contract.
export default defineEventHandler(() => {
  throw domainFailure('not_found')
})
