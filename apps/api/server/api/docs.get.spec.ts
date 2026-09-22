import { beforeEach, describe, expect, it, vi } from 'vitest'

const h3 = vi.hoisted(() => ({
  defineEventHandler: vi.fn((handler: unknown) => handler),
  setHeader: vi.fn(),
}))

vi.mock('h3', () => ({
  defineEventHandler: h3.defineEventHandler,
  setHeader: h3.setHeader,
}))

const handler = (await import('./docs.get')).default as unknown as (event: unknown) => string

describe('get /api/docs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('serves the Scalar shell as HTML', () => {
    const event = {}

    const html = handler(event)

    expect(h3.setHeader).toHaveBeenCalledWith(event, 'content-type', 'text/html; charset=utf-8')
    expect(html).toContain('<div id="app"></div>')
    expect(html).toContain('/api/openapi.json')
    expect(html).toContain('createApiReference')
  })
})
