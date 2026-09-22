import type { AuthTokenStore } from './authToken'
import { beforeEach, describe, expect, it } from 'vitest'
import { browserAuthTokenStore, clearAuthToken, readAuthToken, setAuthTokenStore, writeAuthToken } from './authToken'

beforeEach(async () => {
  setAuthTokenStore(browserAuthTokenStore)
  await browserAuthTokenStore.clear()
})

describe('auth token store', () => {
  it('starts without a token', async () => {
    await expect(readAuthToken()).resolves.toBeNull()
  })

  it('reads back a written token', async () => {
    await writeAuthToken('session-token')

    await expect(readAuthToken()).resolves.toBe('session-token')
  })

  it('clears a stored token', async () => {
    await writeAuthToken('session-token')

    await clearAuthToken()

    await expect(readAuthToken()).resolves.toBeNull()
  })

  it('delegates to a replacement store', async () => {
    let stored: string | null = null
    setAuthTokenStore({
      read: async () => stored,
      write: async (token) => {
        stored = token
      },
      clear: async () => {
        stored = null
      },
    })

    await writeAuthToken('from-the-native-shell')

    await expect(readAuthToken()).resolves.toBe('from-the-native-shell')
    // The browser store is bypassed rather than shadowed.
    await expect(browserAuthTokenStore.read()).resolves.toBeNull()

    await clearAuthToken()

    await expect(readAuthToken()).resolves.toBeNull()
  })

  it('accepts any store that satisfies the contract', async () => {
    const custom: AuthTokenStore = {
      read: async () => 'fixed',
      write: async () => {},
      clear: async () => {},
    }

    setAuthTokenStore(custom)

    await expect(readAuthToken()).resolves.toBe('fixed')
  })
})
