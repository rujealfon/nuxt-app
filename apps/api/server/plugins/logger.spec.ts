import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const child = { child: vi.fn() }
  const logger = { child: vi.fn(() => child) }

  return {
    child,
    logger,
    defineNitroPlugin: vi.fn((plugin: unknown) => plugin),
    getHeader: vi.fn(),
    setHeader: vi.fn(),
    useLogger: vi.fn(() => logger),
  }
})

vi.mock('nitropack/runtime', () => ({ defineNitroPlugin: mocks.defineNitroPlugin }))
vi.mock('h3', () => ({ getHeader: mocks.getHeader, setHeader: mocks.setHeader }))
vi.mock('../utils/logger', () => ({ useLogger: mocks.useLogger }))

const plugin = (await import('./logger')).default as unknown as (app: unknown) => void

function nitroApp() {
  const hooks = new Map<string, (event: unknown) => void>()

  return {
    hooks: {
      hook: vi.fn((name: string, callback: (event: unknown) => void) => hooks.set(name, callback)),
    },
    request: (event: unknown) => hooks.get('request')!(event),
  }
}

describe('logger plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('propagates an inbound request id', () => {
    const app = nitroApp()
    plugin(app)
    mocks.getHeader.mockReturnValue('inbound-id')

    const event = { context: {} as Record<string, unknown> }
    app.request(event)

    expect(event.context.requestId).toBe('inbound-id')
    expect(event.context.logger).toBe(mocks.child)
    expect(mocks.logger.child).toHaveBeenCalledWith({ requestId: 'inbound-id' })
    expect(mocks.setHeader).toHaveBeenCalledWith(event, 'x-request-id', 'inbound-id')
  })

  it('generates a request id when the header is absent', () => {
    const app = nitroApp()
    plugin(app)
    mocks.getHeader.mockReturnValue(undefined)

    const event = { context: {} as Record<string, unknown> }
    app.request(event)

    expect(event.context.requestId).toMatch(/^[0-9a-f-]{36}$/)
    expect(mocks.setHeader).toHaveBeenCalledWith(event, 'x-request-id', event.context.requestId)
  })
})
