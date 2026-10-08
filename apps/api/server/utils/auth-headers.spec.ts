import type { H3Event } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { authHeaders } from './auth-headers'
import { authClientIpHeader } from './auth-ip'

function event(remoteAddress?: string, forwarded = '198.51.100.1, 198.51.100.2'): H3Event {
  return {
    context: {},
    headers: new Headers({
      'x-forwarded-for': forwarded,
      'x-auth-client-ip': '198.51.100.3',
      'authorization': 'Bearer token',
      'cookie': 'session=cookie',
      'origin': 'capacitor://localhost',
    }),
    node: { req: { headers: { 'x-forwarded-for': forwarded }, socket: { remoteAddress } } },
  } as unknown as H3Event
}

describe('authHeaders', () => {
  afterEach(() => vi.unstubAllEnvs())

  it.each([
    '198.51.100.1',
    '198.51.100.1, 198.51.100.2',
    '2001:db8::1',
  ])('ignores direct-ingress forged address %s', (forwarded) => {
    vi.stubEnv('VERCEL', '')
    const incoming = event('203.0.113.7', forwarded)
    const headers = authHeaders(incoming)
    expect(headers.get(authClientIpHeader)).toBe('203.0.113.7')
    expect(headers.get('authorization')).toBe('Bearer token')
    expect(headers.get('cookie')).toBe('session=cookie')
    expect(headers.get('origin')).toBe('capacitor://localhost')
    expect(incoming.headers.get(authClientIpHeader)).toBe('198.51.100.3')
  })

  it('uses Vercel forwarding metadata', () => {
    vi.stubEnv('VERCEL', '1')
    expect(authHeaders(event('203.0.113.7')).get(authClientIpHeader)).toBe('198.51.100.1')
  })

  it('removes a forged internal header when no trusted address is available', () => {
    vi.stubEnv('VERCEL', '')
    expect(authHeaders(event()).has(authClientIpHeader)).toBe(false)
  })

  it('uses the runtime client address when supplied', () => {
    const incoming = event('203.0.113.7')
    incoming.context.clientAddress = '2001:db8::7'
    expect(authHeaders(incoming).get(authClientIpHeader)).toBe('2001:db8::7')
  })
})
