import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DomainFailure } from '../../utils/domain-failure'

const mocks = vi.hoisted(() => ({
  getItem: vi.fn(),
  defineEventHandler: vi.fn((handler: unknown) => handler),
  setHeader: vi.fn(),
}))

vi.mock('h3', () => ({
  defineEventHandler: mocks.defineEventHandler,
  setHeader: mocks.setHeader,
}))
vi.mock('nitropack/runtime', () => ({
  useStorage: () => ({ getItem: mocks.getItem }),
}))

const handler = (await import('./standalone.js.get')).default as unknown as (event: unknown) => Promise<string>

async function caughtFrom(event: unknown): Promise<unknown> {
  return handler(event).then(() => undefined, (error: unknown) => error)
}

describe('get /api/docs-assets/standalone.js', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('serves the embedded bundle with no-store caching', async () => {
    mocks.getItem.mockResolvedValue('console.log("scalar")')
    const event = {}

    await expect(handler(event)).resolves.toBe('console.log("scalar")')
    expect(mocks.setHeader).toHaveBeenCalledWith(event, 'content-type', 'text/javascript; charset=utf-8')
    expect(mocks.setHeader).toHaveBeenCalledWith(event, 'cache-control', 'no-store')
  })

  it('throws internal_error when the bundle is missing', async () => {
    mocks.getItem.mockResolvedValue(undefined)

    const caught = await caughtFrom({})

    expect(caught).toBeInstanceOf(DomainFailure)
    expect((caught as DomainFailure).error).toBe('internal_error')
  })

  it('throws internal_error when the bundle is empty', async () => {
    mocks.getItem.mockResolvedValue('')

    expect(await caughtFrom({})).toBeInstanceOf(DomainFailure)
  })
})
