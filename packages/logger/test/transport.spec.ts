import { beforeEach, describe, expect, it, vi } from 'vitest'

// `pino` is mocked so the pretty transport never spawns a worker thread; the
// point is the config `createLogger` assembles, not pino itself.
const pino = vi.hoisted(() => ({
  pino: vi.fn((config: { level?: string }) => ({ config, level: config.level })),
}))

vi.mock('pino', () => ({ pino: pino.pino }))

const { createLogger } = await import('../index')

describe('createLogger options', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('applies the base bindings', () => {
    createLogger({ pretty: false, base: { service: 'api' } })

    expect(pino.pino).toHaveBeenCalledWith(expect.objectContaining({ base: { service: 'api' } }))
  })

  it('omits base bindings by default', () => {
    createLogger({ pretty: false })

    const config = pino.pino.mock.calls[0]![0] as Record<string, unknown>
    expect('base' in config).toBe(false)
  })

  it('attaches the pretty transport when pretty', () => {
    createLogger({ pretty: true })

    const config = pino.pino.mock.calls[0]![0] as { transport?: { target: string } }
    expect(config.transport?.target).toBe('pino-pretty')
  })

  it('omits the transport when not pretty', () => {
    createLogger({ pretty: false })

    const config = pino.pino.mock.calls[0]![0] as { transport?: unknown }
    expect(config.transport).toBeUndefined()
  })
})
