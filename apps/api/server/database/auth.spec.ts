import { describe, expect, it, vi } from 'vitest'

// `rate-limit` pulls in Redis + Nitro runtime; stub the runtime so this unit
// test can construct the auth instance without a Nitro context.
vi.mock('nitropack/runtime', () => ({ useRuntimeConfig: vi.fn() }))

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
