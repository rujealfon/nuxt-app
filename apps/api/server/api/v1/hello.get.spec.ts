import { beforeEach, describe, expect, it, vi } from 'vitest'

const h3 = vi.hoisted(() => ({
  defineEventHandler: vi.fn((handler: unknown) => handler),
  setHeader: vi.fn(),
}))

vi.mock('h3', () => ({
  defineEventHandler: h3.defineEventHandler,
  setHeader: h3.setHeader,
}))

const handler = (await import('./hello.get')).default as unknown as (event: unknown) => { message: string }

describe('get /api/v1/hello', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the v1 message and advertises the version', () => {
    const event = {}

    expect(handler(event)).toEqual({ message: 'Hello from api.nuxt-app.com' })
    expect(h3.setHeader).toHaveBeenCalledWith(event, 'x-api-version', 'v1')
  })
})
