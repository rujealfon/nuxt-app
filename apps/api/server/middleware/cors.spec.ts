import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  setHeader: vi.fn(),
  getHeader: vi.fn(),
  getMethod: vi.fn(() => 'GET'),
  setResponseStatus: vi.fn(),
  state: { corsOrigins: '' },
}))

vi.mock('h3', () => ({
  defineEventHandler: (handler: unknown) => handler,
  getHeader: mocks.getHeader,
  getMethod: mocks.getMethod,
  setHeader: mocks.setHeader,
  setResponseStatus: mocks.setResponseStatus,
}))

vi.mock('nitropack/runtime', () => ({
  useRuntimeConfig: () => ({ corsOrigins: mocks.state.corsOrigins }),
}))

const handler = (await import('./cors')).default as (event: unknown) => unknown

const { setHeader, setResponseStatus } = mocks

function event() {
  return { context: {} }
}

function header(name: string) {
  return setHeader.mock.calls.find(([, key]) => key === name)?.[2]
}

describe('cors middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.state.corsOrigins = ''
    mocks.getMethod.mockReturnValue('GET')
    mocks.getHeader.mockReturnValue(undefined)
  })

  it('allows a default localhost origin with credentials', () => {
    mocks.getHeader.mockReturnValue('http://localhost:3001')

    handler(event())

    expect(header('access-control-allow-origin')).toBe('http://localhost:3001')
    expect(header('access-control-allow-credentials')).toBe('true')
    expect(header('vary')).toBe('Origin')
  })

  it('uses configured origins when present', () => {
    mocks.state.corsOrigins = 'https://app.example.com, https://admin.example.com'
    mocks.getHeader.mockReturnValue('https://admin.example.com')

    handler(event())

    expect(header('access-control-allow-origin')).toBe('https://admin.example.com')
  })

  it('does not allow an origin outside the configured list', () => {
    mocks.state.corsOrigins = 'https://app.example.com'
    mocks.getHeader.mockReturnValue('https://evil.example.com')

    handler(event())

    expect(header('access-control-allow-origin')).toBeUndefined()
    expect(header('access-control-allow-credentials')).toBeUndefined()
  })

  it('answers a wildcard origin without credentials', () => {
    mocks.state.corsOrigins = '*'
    mocks.getHeader.mockReturnValue('https://any.example.com')

    handler(event())

    expect(header('access-control-allow-origin')).toBe('*')
    expect(header('access-control-allow-credentials')).toBeUndefined()
  })

  it('always advertises the allowed methods and headers', () => {
    handler(event())

    expect(header('access-control-allow-methods')).toBe('GET,POST,PUT,PATCH,DELETE,OPTIONS')
    expect(header('access-control-allow-headers')).toBe('content-type, authorization')
  })

  it('short-circuits preflight requests with 204', () => {
    mocks.getMethod.mockReturnValue('OPTIONS')

    const result = handler(event())

    expect(setResponseStatus).toHaveBeenCalledWith(expect.anything(), 204)
    expect(result).toBe('')
  })
})
