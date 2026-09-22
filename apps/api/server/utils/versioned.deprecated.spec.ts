import { beforeEach, describe, expect, it, vi } from 'vitest'

const h3 = vi.hoisted(() => ({
  setHeader: vi.fn(),
  defineEventHandler: vi.fn((handler: unknown) => handler),
}))

vi.mock('h3', () => ({
  setHeader: h3.setHeader,
  defineEventHandler: h3.defineEventHandler,
}))
vi.mock('./deprecation', () => ({
  deprecationHeaders: () => [
    ['deprecation', 'true'],
    ['sunset', 'Wed, 31 Dec 2026 00:00:00 GMT'],
  ] as [string, string][],
}))

const { defineVersionedHandler } = await import('./versioned')

describe('defineVersionedHandler deprecation headers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets every deprecation header', () => {
    const event = {}
    const wrapped = defineVersionedHandler('v1', (() => 'ok') as never) as unknown as (event: unknown) => unknown

    wrapped(event)

    expect(h3.setHeader).toHaveBeenCalledWith(event, 'deprecation', 'true')
    expect(h3.setHeader).toHaveBeenCalledWith(event, 'sunset', 'Wed, 31 Dec 2026 00:00:00 GMT')
  })
})
