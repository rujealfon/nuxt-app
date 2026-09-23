import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  setHeader: vi.fn(),
  getHeader: vi.fn(),
  setResponseStatus: vi.fn(),
  state: { corsOrigins: '', authBearerEnabled: false, authBearerOrigins: '' },
}))

vi.mock('h3', () => ({
  defineEventHandler: (handler: unknown) => handler,
  getHeader: mocks.getHeader,
  setHeader: mocks.setHeader,
  setResponseStatus: mocks.setResponseStatus,
}))

vi.mock('nitropack/runtime', () => ({
  useRuntimeConfig: () => ({
    corsOrigins: mocks.state.corsOrigins,
    authBearerEnabled: mocks.state.authBearerEnabled,
    authBearerOrigins: mocks.state.authBearerOrigins,
  }),
}))

const handler = (await import('./cors')).default as (event: unknown) => unknown

const { setHeader, setResponseStatus } = mocks

function event(method = 'GET') {
  return { method, context: {} }
}

function header(name: string) {
  return setHeader.mock.calls.find(([, key]) => key === name)?.[2]
}

describe('cors middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.state.corsOrigins = ''
    mocks.state.authBearerEnabled = false
    mocks.state.authBearerOrigins = ''
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

  it('exposes the bearer session token only to an explicit native origin', () => {
    mocks.state.authBearerEnabled = true
    mocks.state.authBearerOrigins = 'capacitor://localhost'
    mocks.state.corsOrigins = 'https://app.example.com,capacitor://localhost'

    mocks.getHeader.mockReturnValue('https://app.example.com')
    handler(event())
    expect(header('access-control-expose-headers')).toBeUndefined()

    vi.clearAllMocks()
    mocks.getHeader.mockReturnValue('capacitor://localhost')
    handler(event())

    expect(header('access-control-expose-headers')).toBe('set-auth-token')
  })

  it('short-circuits preflight requests with 204', () => {
    const result = handler(event('OPTIONS'))

    expect(setResponseStatus).toHaveBeenCalledWith(expect.anything(), 204)
    expect(result).toBe('')
  })
})
