import { afterEach, describe, expect, it } from 'vitest'
import { createLogger } from '../index'

const originalNodeEnv = process.env.NODE_ENV
const originalLogLevel = process.env.LOG_LEVEL

afterEach(() => {
  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV
  }
  else {
    process.env.NODE_ENV = originalNodeEnv
  }

  if (originalLogLevel === undefined) {
    delete process.env.LOG_LEVEL
  }
  else {
    process.env.LOG_LEVEL = originalLogLevel
  }
})

describe('createLogger', () => {
  it('defaults to debug outside production', () => {
    process.env.NODE_ENV = 'development'
    delete process.env.LOG_LEVEL

    expect(createLogger({ pretty: false }).level).toBe('debug')
  })

  it('defaults to info in production', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.LOG_LEVEL

    expect(createLogger({ pretty: false }).level).toBe('info')
  })

  it('honours LOG_LEVEL', () => {
    process.env.NODE_ENV = 'development'
    process.env.LOG_LEVEL = 'warn'

    expect(createLogger({ pretty: false }).level).toBe('warn')
  })

  it('honours an explicit level', () => {
    expect(createLogger({ pretty: false, level: 'error' }).level).toBe('error')
  })
})
