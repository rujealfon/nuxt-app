import { afterEach, describe, expect, it } from 'vitest'
import { browserAuthTokenStore, readAuthToken, writeAuthToken } from '../lib/authToken'
import { useAuthTokenStore } from './useAuthTokenStore'

afterEach(async () => {
  useAuthTokenStore(browserAuthTokenStore)
  await browserAuthTokenStore.clear()
})

describe('useAuthTokenStore', () => {
  it('returns the store in use', () => {
    expect(useAuthTokenStore()).toBe(browserAuthTokenStore)
  })

  it('installs a replacement store', async () => {
    let stored: string | null = null

    useAuthTokenStore({
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
    await expect(browserAuthTokenStore.read()).resolves.toBeNull()
  })
})
