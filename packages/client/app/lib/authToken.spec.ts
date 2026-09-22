import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { memoryAuthTokenStore, resetAuthTokenStore } from '../../test/helpers/authTokenStore'
import { browserAuthTokenStore, captureIssuedToken, clearAuthToken, readAuthToken, setAuthTokenStore, writeAuthToken } from './authToken'

beforeEach(resetAuthTokenStore)
afterEach(() => {
  vi.unstubAllGlobals()
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
    setAuthTokenStore(memoryAuthTokenStore())

    await writeAuthToken('from-the-native-shell')

    await expect(readAuthToken()).resolves.toBe('from-the-native-shell')
    // The browser store is bypassed rather than shadowed.
    await expect(browserAuthTokenStore.read()).resolves.toBeNull()

    await clearAuthToken()

    await expect(readAuthToken()).resolves.toBeNull()
  })

  it('accepts any store that satisfies the contract', async () => {
    setAuthTokenStore({ ...memoryAuthTokenStore('fixed') })

    await expect(readAuthToken()).resolves.toBe('fixed')
  })
})

describe('auth token store failures', () => {
  const rejectingStore = {
    read: async () => {
      throw new Error('keystore unavailable')
    },
    write: async () => {
      throw new Error('keystore unavailable')
    },
    clear: async () => {
      throw new Error('keystore unavailable')
    },
  }

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  // A store that rejects must degrade to "no token", not fail the request or a
  // sign-in that already succeeded on the server.
  it('reads as no token when the store rejects', async () => {
    setAuthTokenStore(rejectingStore)

    await expect(readAuthToken()).resolves.toBeNull()
    expect(console.warn).toHaveBeenCalled()
  })

  it('does not reject on write when the store rejects', async () => {
    setAuthTokenStore(rejectingStore)

    await expect(writeAuthToken('session-token')).resolves.toBeUndefined()
  })

  it('does not reject on clear when the store rejects', async () => {
    setAuthTokenStore(rejectingStore)

    await expect(clearAuthToken()).resolves.toBeUndefined()
  })
})

describe('captureIssuedToken', () => {
  it('stores the token a response hands back', async () => {
    await captureIssuedToken(new Response(null, { headers: { 'set-auth-token': 'issued-token' } }))

    await expect(readAuthToken()).resolves.toBe('issued-token')
  })

  it('leaves the stored token alone when the response carries none', async () => {
    await writeAuthToken('session-token')

    await captureIssuedToken(new Response(null))

    await expect(readAuthToken()).resolves.toBe('session-token')
  })
})

describe('without browser storage (SSR)', () => {
  it('holds no token and never throws', async () => {
    vi.stubGlobal('localStorage', undefined)

    await expect(browserAuthTokenStore.read()).resolves.toBeNull()
    await expect(browserAuthTokenStore.write('session-token')).resolves.toBeUndefined()
    await expect(browserAuthTokenStore.clear()).resolves.toBeUndefined()
  })
})
