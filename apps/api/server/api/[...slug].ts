// Strict 404 for any `/api/*` path without a matching route. Product routes are
// versioned (`/api/v1/*`); infra routes (`/api/auth`, `/api/health`) match
// static routes and take precedence over this catch-all.
export default defineEventHandler((event) => {
  setResponseStatus(event, 404)

  return {
    error: 'not_found',
    message: `No API route matches ${getRequestURL(event).pathname}`,
  }
})
