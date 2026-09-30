import { afterEach, describe, expect, it, vi } from 'vitest'

const { createAuth } = await import('./auth')

// The bearer plugin is not inert for cookie clients: it emits `set-auth-token`
// on any response that sets a session cookie (see ADR-0003). The API must only
// register it when the deployment opts in.
function pluginIds(bearerEnabled: boolean): string[] {
  const auth = createAuth({} as never, {
    secret: 'test-secret-test-secret-test-secret',
    baseURL: 'http://localhost:3003',
    bearerEnabled,
  })

  return (auth.options.plugins ?? []).map(plugin => plugin.id)
}

describe('createAuth plugins', () => {
  it('omits the bearer plugin by default', () => {
    expect(pluginIds(false)).not.toContain('bearer')
  })

  it('registers the bearer plugin when enabled', () => {
    expect(pluginIds(true)).toContain('bearer')
  })
})

describe('authentication origin boundary', () => {
  afterEach(() => vi.unstubAllEnvs())

  it.each(['*', 'https://*.example.com', 'https://app?.example.com', 'null', 'https://app.example.com/path'])('rejects unsafe trusted origin %s', (origin) => {
    expect(() => createAuth({} as never, {
      secret: 'test-secret-test-secret-test-secret',
      baseURL: 'http://localhost:3003',
      trustedOrigins: [origin],
    })).toThrow(/explicit origins/)
  })

  it('rejects wildcards supplied through Better Auth environment configuration', () => {
    vi.stubEnv('BETTER_AUTH_TRUSTED_ORIGINS', '*')
    expect(() => pluginIds(false)).toThrow(/explicit origins/)
  })

  it('rejects a wildcard in the automatically trusted base URL', () => {
    expect(() => createAuth({} as never, {
      secret: 'test-secret-test-secret-test-secret',
      baseURL: 'https://*.example.com',
    })).toThrow(/explicit origins/)
  })

  it('denies a same-site form from an untrusted origin and accepts explicit browser and native origins', async () => {
    const auth = createAuth({} as never, {
      secret: 'test-secret-test-secret-test-secret',
      baseURL: 'https://api.example.com',
      trustedOrigins: ['https://app.example.com', 'capacitor://localhost'],
      rateLimitStorage: { consume: async () => ({ allowed: true, retryAfter: null }) },
    })
    for (const [origin, status] of [
      ['https://evil.example.com', 403],
      ['https://app.example.com', 400],
      ['capacitor://localhost', 400],
    ] as const) {
      const response = await auth.handler(new Request('https://api.example.com/api/auth/sign-in/email', {
        method: 'POST',
        headers: { origin, 'sec-fetch-site': 'same-site', 'content-type': 'application/x-www-form-urlencoded' },
        body: 'email=invalid&password=invalid',
      }))
      expect(response.status).toBe(status)
    }
  })
})
