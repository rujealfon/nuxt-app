// Self-hosted Scalar shell. The UI bundle loads from our own origin
// (`nitro.serverAssets` embeds the installed `@scalar/api-reference`
// standalone build), so docs work offline and stay version-pinned with the API.

export const openApiSpecUrl = '/api/openapi.json'
export const scalarStandaloneJsUrl = '/api/docs-assets/standalone.js'

export interface DocsHtmlOptions {
  title?: string
  specUrl?: string
  jsUrl?: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Renders the complete docs page. Pure string building so specs never boot
// Nitro; the route sets the HTML content type.
export function buildDocsHtml(options: DocsHtmlOptions = {}): string {
  const title = escapeHtml(options.title ?? 'nuxt-app API docs')
  const specUrl = JSON.stringify(options.specUrl ?? openApiSpecUrl)
  const jsUrl = escapeHtml(options.jsUrl ?? scalarStandaloneJsUrl)

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex, nofollow" />
    <title>${title}</title>
  </head>
  <body>
    <div id="app"></div>
    <script src="${jsUrl}"></script>
    <script>
      Scalar.createApiReference('#app', { url: ${specUrl} })
    </script>
  </body>
</html>
`
}
