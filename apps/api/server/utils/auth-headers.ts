import type { H3Event } from 'h3'
import { getRequestIP } from 'h3'
import { authClientIpHeader } from './auth-ip'

export function authHeaders(event: H3Event, source: Headers = event.headers): Headers {
  const headers = new Headers(source)
  // Never accept a client-supplied copy of our internal header. On direct
  // ingress use the socket; Vercel supplies its verified forwarding metadata.
  headers.delete(authClientIpHeader)
  const ip = getRequestIP(event, { xForwardedFor: process.env.VERCEL === '1' })
  if (ip) {
    headers.set(authClientIpHeader, ip)
  }
  // Missing addresses fall into Better Auth's shared per-path budget.
  return headers
}
