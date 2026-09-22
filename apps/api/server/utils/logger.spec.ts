import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const logger = { child: vi.fn() }

  return {
    logger,
    createLogger: vi.fn(() => logger),
  }
})

vi.mock('@nuxt-app/logger', () => ({ createLogger: mocks.createLogger }))

let mod: typeof import('./logger')

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()
  mod = await import('./logger')
})

describe('useLogger', () => {
  it('creates the api logger once', () => {
    expect(mod.useLogger()).toBe(mocks.logger)
    expect(mocks.createLogger).toHaveBeenCalledWith({ name: 'api' })
    expect(mocks.createLogger).toHaveBeenCalledTimes(1)

    mod.useLogger()
    expect(mocks.createLogger).toHaveBeenCalledTimes(1)
  })
})
