// Scalar interactive docs for the versioned product API. Development-only
// behind the docs guard. Serves an HTML shell (not JSON): the error adapter
// still renders failures as the product error contract. Unversioned, like
// `/api/health`.
export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'text/html; charset=utf-8')

  return buildDocsHtml()
})
