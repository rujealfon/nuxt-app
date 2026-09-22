import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { memoryAuthTokenStore, resetAuthTokenStore } from '../../test/helpers/authTokenStore'
import { browserAuthTokenStore, captureIssuedToken, clearAuthToken, installAuthTokenStore, readAuthToken, writeAuthToken } from './authToken'

beforeEach(resetAuthTokenStore)
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
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
    installAuthTokenStore(memoryAuthTokenStore())

    await writeAuthToken('from-the-native-shell')

    await expect(readAuthToken()).resolves.toBe('from-the-native-shell')
    // The browser store is bypassed rather than shadowed.
    await expect(browserAuthTokenStore.read()).resolves.toBeNull()

    await clearAuthToken()

    await expect(readAuthToken()).resolves.toBeNull()
  })

  it('accepts any store that satisfies the contract', async () => {
    installAuthTokenStore({ ...memoryAuthTokenStore('fixed') })

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

  it('reads as no token when the store rejects', async () => {
    installAuthTokenStore(rejectingStore)

    await expect(readAuthToken()).resolves.toBeNull()
    expect(console.warn).toHaveBeenCalled()
  })

  it('rejects a failed write and prevents reuse of the previous account', async () => {
    installAuthTokenStore({ ...rejectingStore, read: async () => 'old-session' })

    await expect(writeAuthToken('new-session')).rejects.toThrow('Unable to save')
    await expect(readAuthToken()).resolves.toBeNull()
  })

  it('rejects a failed clear and stops sending the persisted token', async () => {
    installAuthTokenStore({ ...rejectingStore, read: async () => 'old-session' })

    await expect(clearAuthToken()).rejects.toThrow('Unable to remove')
    await expect(readAuthToken()).resolves.toBeNull()
  })

  it('removes the previous persisted token after a failed write when possible', async () => {
    const store = memoryAuthTokenStore('old-session')
    installAuthTokenStore({ ...store, write: rejectingStore.write })

    await expect(writeAuthToken('new-session')).rejects.toThrow('Unable to save')
    await expect(store.read()).resolves.toBeNull()
  })

  it('recovers after a successful retry', async () => {
    const store = memoryAuthTokenStore('old-session')
    const write = vi.fn(store.write).mockRejectedValueOnce(new Error('temporarily unavailable'))
    installAuthTokenStore({ ...store, write })

    await expect(writeAuthToken('new-session')).rejects.toThrow('Unable to save')
    await writeAuthToken('new-session')

    await expect(readAuthToken()).resolves.toBe('new-session')
  })

  it('also invalidates old credentials when browser storage throws', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => 'old-session',
      setItem: () => { throw new Error('quota exceeded') },
      removeItem: () => { throw new Error('storage blocked') },
    })

    await expect(writeAuthToken('new-session')).rejects.toThrow('Unable to save')
    await expect(readAuthToken()).resolves.toBeNull()
    await expect(clearAuthToken()).rejects.toThrow('Unable to remove')
    await expect(readAuthToken()).resolves.toBeNull()
  })
})

describe('concurrent storage mutations', () => {
  it('finishes a slow native clear before saving a newer sign-in', async () => {
    const started = Promise.withResolvers<void>()
    const release = Promise.withResolvers<void>()
    const store = memoryAuthTokenStore('old-session')
    installAuthTokenStore({
      ...store,
      clear: async () => {
        started.resolve()
        await release.promise
        await store.clear()
      },
    })

    const clearing = clearAuthToken('old-session')
    await started.promise
    const writing = writeAuthToken('new-session')
    release.resolve()
    await Promise.all([clearing, writing])

    await expect(readAuthToken()).resolves.toBe('new-session')
    await expect(store.read()).resolves.toBe('new-session')
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
