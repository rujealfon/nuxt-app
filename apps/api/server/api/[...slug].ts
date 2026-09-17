// Strict 404 for any `/api/*` path without a matching route. Product routes are
// versioned (`/api/v1/*`); infra routes (`/api/auth`, `/api/health`) match
// static routes and take precedence over this catch-all. The error adapter
// renders the thrown failure as the product error contract.
export default defineEventHandler(() => {
  throw productFailure('not_found')
})
