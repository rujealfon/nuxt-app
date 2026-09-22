import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { memoryAuthTokenStore, resetAuthTokenStore } from '../../test/helpers/authTokenStore'
import { browserAuthTokenStore, readAuthToken, writeAuthToken } from '../lib/authToken'
import { useAuthTokenStore } from './useAuthTokenStore'

beforeEach(resetAuthTokenStore)
afterEach(() => {
  vi.restoreAllMocks()
})

describe('useAuthTokenStore', () => {
  it('returns the store in use', () => {
    expect(useAuthTokenStore()).toBe(browserAuthTokenStore)
  })

  it('installs a replacement store', async () => {
    useAuthTokenStore(memoryAuthTokenStore())

    await writeAuthToken('from-the-native-shell')

    await expect(readAuthToken()).resolves.toBe('from-the-native-shell')
    await expect(browserAuthTokenStore.read()).resolves.toBeNull()
  })

  it('keeps the first store when installed again after setup', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const first = memoryAuthTokenStore()
    const second = memoryAuthTokenStore()

    useAuthTokenStore(first)
    await writeAuthToken('session-token')
    useAuthTokenStore(second)

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('existing store remains active'))
    expect(useAuthTokenStore()).toBe(first)
    await expect(readAuthToken()).resolves.toBe('session-token')
    await expect(second.read()).resolves.toBeNull()
  })
})
