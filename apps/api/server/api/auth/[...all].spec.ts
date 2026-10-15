import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DomainFailure, failure } from '#server/utils/domain-failure'
import { err, ok } from '#server/utils/result'

const mocks = vi.hoisted(() => ({
  handleAuthRequest: vi.fn(),
  defineEventHandler: vi.fn((handler: unknown) => handler),
  useRuntimeConfig: vi.fn(),
}))

vi.mock('h3', () => ({ defineEventHandler: mocks.defineEventHandler }))
vi.mock('nitropack/runtime', () => ({ useRuntimeConfig: mocks.useRuntimeConfig }))
vi.mock('#server/services/auth', () => ({ handleAuthRequest: mocks.handleAuthRequest }))

const route = (await import('./[...all]')).default as unknown as (
  event: unknown,
) => Promise<unknown>

describe('auth mount route', () => {
  beforeEach(() => {
    mocks.handleAuthRequest.mockReset()
    mocks.useRuntimeConfig.mockReset()
  })

  it('delegates the whole pipeline to the auth service with the runtime config', async () => {
    const event = { path: '/api/auth/get-session' }
    const config = { rateLimitEnabled: true, authBearerEnabled: false, authBearerOrigins: '' }
    mocks.useRuntimeConfig.mockReturnValue(config)
    mocks.handleAuthRequest.mockResolvedValue(ok(new Response(null)))

    await route(event)

    expect(mocks.useRuntimeConfig).toHaveBeenCalledWith(event)
    expect(mocks.handleAuthRequest).toHaveBeenCalledWith(event, config)
  })

  it('returns the service response unchanged', async () => {
    const response = new Response('{}', { status: 200 })
    mocks.handleAuthRequest.mockResolvedValue(ok(response))

    await expect(route({})).resolves.toBe(response)
  })

  it('throws an expected failure as a domain failure for the error adapter', async () => {
    const details = [{ path: ['email'], message: 'Enter a valid email address' }]
    mocks.handleAuthRequest.mockResolvedValue(
      err(failure('invalid_input', undefined, details)),
    )

    const caught = await route({}).catch((error: unknown) => error)

    expect(caught).toBeInstanceOf(DomainFailure)
    expect(caught).toMatchObject({ error: 'invalid_input', details })
  })

  it('lets an unexpected service fault propagate as is', async () => {
    mocks.handleAuthRequest.mockRejectedValue(new Error('database down'))

    await expect(route({})).rejects.toThrow('database down')
  })
})
