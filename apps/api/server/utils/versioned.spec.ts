import { beforeEach, describe, expect, it, vi } from 'vitest'

const setHeader = vi.fn()
const defineEventHandler = vi.fn((handler: unknown) => handler)

vi.stubGlobal('setHeader', setHeader)
vi.stubGlobal('defineEventHandler', defineEventHandler)

const { deprecatedApiVersions } = await import('@nuxt-app/config')
const { defineVersionedHandler } = await import('./versioned')

describe('defineVersionedHandler', () => {
  beforeEach(() => {
    setHeader.mockClear()
    delete deprecatedApiVersions.v1
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

  it('adds deprecation headers for a deprecated version', () => {
    deprecatedApiVersions.v1 = { sunset: '2026-12-31' }
    const wrapped = defineVersionedHandler('v1', (() => 'ok') as never) as unknown as (event: unknown) => unknown
    const event = {}

    wrapped(event)

    expect(setHeader).toHaveBeenCalledWith(event, 'deprecation', 'true')
    expect(setHeader).toHaveBeenCalledWith(event, 'sunset', new Date('2026-12-31').toUTCString())
  })

  it('omits deprecation headers for a live version', () => {
    const wrapped = defineVersionedHandler('v1', (() => 'ok') as never) as unknown as (event: unknown) => unknown

    wrapped({})

    expect(setHeader).not.toHaveBeenCalledWith(expect.anything(), 'deprecation', expect.anything())
  })
})
