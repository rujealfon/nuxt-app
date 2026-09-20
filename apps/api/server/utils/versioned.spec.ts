import type { VersionMeta } from '@nuxt-app/config'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h3 = vi.hoisted(() => ({
  setHeader: vi.fn(),
  defineEventHandler: vi.fn((handler: unknown) => handler),
}))

vi.mock('h3', () => ({
  setHeader: h3.setHeader,
  defineEventHandler: h3.defineEventHandler,
}))

const { defineVersionedHandler, deprecationHeaders } = await import('./versioned')

const { setHeader } = h3

describe('defineVersionedHandler', () => {
  beforeEach(() => {
    setHeader.mockClear()
  })

  it('advertises the version and forwards the event', () => {
    const handler = vi.fn((event: unknown) => event)
    const wrapped = defineVersionedHandler('v1', handler as never) as unknown as (event: unknown) => unknown
    const event = { id: 1 }

    const result = wrapped(event)

    expect(setHeader).toHaveBeenCalledWith(event, 'x-api-version', 'v1')
    expect(handler).toHaveBeenCalledWith(event)
    expect(result).toBe(event)
  })

  it('omits deprecation headers for the live version', () => {
    const wrapped = defineVersionedHandler('v1', (() => 'ok') as never) as unknown as (event: unknown) => unknown

    wrapped({})

    expect(setHeader).not.toHaveBeenCalledWith(expect.anything(), 'deprecation', expect.anything())
  })
})

describe('deprecationHeaders', () => {
  it('renders the pair for deprecated metadata', () => {
    const meta: VersionMeta = { version: 'v1', deprecated: true, sunset: '2026-12-31' }

    expect(deprecationHeaders(meta)).toEqual([
      ['deprecation', 'true'],
      ['sunset', new Date('2026-12-31').toUTCString()],
    ])
  })

  it('renders nothing for a live version', () => {
    const meta: VersionMeta = { version: 'v1', deprecated: false }

    expect(deprecationHeaders(meta)).toEqual([])
  })
})
