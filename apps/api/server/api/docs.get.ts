// Scalar interactive docs for versioned routes. Development-only behind the
// docs guard. Serves an HTML shell (not JSON): the error adapter still
// renders failures as the API error contract. Unversioned infra route, like
// `/api/health`.
export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'text/html; charset=utf-8')

  return buildDocsHtml()
})
