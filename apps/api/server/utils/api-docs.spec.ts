import { describe, expect, it } from 'vitest'
import { buildDocsHtml, openApiSpecUrl, scalarStandaloneJsUrl } from './api-docs'

describe('buildDocsHtml', () => {
  it('renders a self-hosted Scalar shell pointing at the local spec', () => {
    const html = buildDocsHtml()

    expect(html).toContain('<div id="app"></div>')
    expect(html).toContain(`<script src="${scalarStandaloneJsUrl}"></script>`)
    expect(html).toContain(`Scalar.createApiReference('#app', { url: '${openApiSpecUrl}' })`)
    expect(html).toContain('noindex, nofollow')
    expect(html).not.toContain('cdn.jsdelivr.net')
  })

  it('escapes the title', () => {
    const html = buildDocsHtml({ title: 'docs <script>alert(1)</script>' })

    expect(html).toContain('<title>docs &lt;script&gt;alert(1)&lt;/script&gt;</title>')
    expect(html.match(/<script/g)?.length).toBe(2)
  })
})
