import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  handleAuthRequest: vi.fn(),
  defineEventHandler: vi.fn((handler: unknown) => handler),
}))

vi.mock('h3', () => ({ defineEventHandler: mocks.defineEventHandler }))
vi.mock('../../services/auth', () => ({ handleAuthRequest: mocks.handleAuthRequest }))

const route = (await import('./[...all]')).default as unknown as (event: unknown) => unknown

describe('auth mount route', () => {
  beforeEach(() => {
    mocks.handleAuthRequest.mockReset()
  })

  it('delegates the whole pipeline to the auth service', async () => {
    const event = { path: '/api/auth/get-session' }

    await route(event)

    expect(mocks.handleAuthRequest).toHaveBeenCalledWith(event)
  })
})
