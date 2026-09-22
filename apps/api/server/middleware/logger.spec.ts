import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }

  return {
    logger,
    defineEventHandler: vi.fn((handler: unknown) => handler),
    getResponseStatus: vi.fn(),
    useLogger: vi.fn(() => logger),
  }
})

vi.mock('h3', () => ({
  defineEventHandler: mocks.defineEventHandler,
  getResponseStatus: mocks.getResponseStatus,
}))
vi.mock('../utils/logger', () => ({ useLogger: mocks.useLogger }))

const handler = (await import('./logger')).default as unknown as (event: unknown) => void

interface EventOptions {
  path?: string
  method?: string
  status?: number
  logger?: Record<string, (...args: unknown[]) => void>
}

function makeEvent({ path = '/api/v1/hello', method = 'GET', status = 200, logger }: EventOptions = {}) {
  let finish: (() => void) | undefined

  const event = {
    context: logger ? { logger } : {},
    path,
    method,
    node: {
      res: {
        on: vi.fn((name: string, callback: () => void) => {
          if (name === 'finish') {
            finish = callback
          }
        }),
      },
    },
  }

  mocks.getResponseStatus.mockReturnValue(status)

  return { event, complete: () => finish?.() }
}

describe('request logger middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('logs a successful request at info', () => {
    const { event, complete } = makeEvent()

    handler(event)
    complete()

    expect(mocks.logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        path: '/api/v1/hello',
        status: 200,
        durationMs: expect.any(Number),
      }),
      'request completed',
    )
  })

  it('quiets health checks to debug', () => {
    const { event, complete } = makeEvent({ path: '/api/health' })

    handler(event)
    complete()

    expect(mocks.logger.debug).toHaveBeenCalled()
    expect(mocks.logger.info).not.toHaveBeenCalled()
  })

  it('warns on a client error', () => {
    const { event, complete } = makeEvent({ status: 400 })

    handler(event)
    complete()

    expect(mocks.logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ status: 400 }),
      'request completed',
    )
  })

  it('errors on a server error', () => {
    const { event, complete } = makeEvent({ status: 500 })

    handler(event)
    complete()

    expect(mocks.logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ status: 500 }),
      'request failed',
    )
  })

  it('prefers the request-scoped logger', () => {
    const scoped = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
    const { event, complete } = makeEvent({ logger: scoped })

    handler(event)
    complete()

    expect(mocks.useLogger).not.toHaveBeenCalled()
    expect(scoped.info).toHaveBeenCalled()
  })

  it('registers the finish listener on the response', () => {
    const { event } = makeEvent()

    handler(event)

    expect(event.node.res.on).toHaveBeenCalledWith('finish', expect.any(Function))
  })
})
