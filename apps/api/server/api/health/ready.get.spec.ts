import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  ping: vi.fn(),
}))

vi.mock('h3', () => ({ defineEventHandler: (handler: unknown) => handler }))
vi.mock('../../utils/db', () => ({ useDb: () => ({ execute: mocks.execute }) }))
vi.mock('../../utils/redis', () => ({ useRedis: () => ({ ping: mocks.ping }) }))

const handler = (await import('./ready.get')).default as () => Promise<unknown>

const { execute, ping } = mocks

describe('readiness route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports database and redis as ready', async () => {
    execute.mockResolvedValue({ rows: [{ ok: 1 }] })
    ping.mockResolvedValue('PONG')

    await expect(handler()).resolves.toEqual({ database: true, redis: true })
  })

  it('reports both dependencies as not ready', async () => {
    execute.mockResolvedValue({ rows: [{ ok: 0 }] })
    ping.mockResolvedValue('ERR')

    await expect(handler()).resolves.toEqual({ database: false, redis: false })
  })

  it('treats an empty database result as not ready', async () => {
    execute.mockResolvedValue({ rows: [] })
    ping.mockResolvedValue('PONG')

    await expect(handler()).resolves.toEqual({ database: false, redis: true })
  })
})
