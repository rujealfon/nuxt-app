import { afterEach, describe, expect, it, vi } from 'vitest'
import { memoryAuthTokenStore, resetAuthTokenStore } from '../../test/helpers/authTokenStore'
import { browserAuthTokenStore, readAuthToken, writeAuthToken } from '../lib/authToken'
import { useAuthTokenStore } from './useAuthTokenStore'

afterEach(resetAuthTokenStore)

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

  it('warns when installed again after setup', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    useAuthTokenStore(memoryAuthTokenStore())

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('install the store once'))
  })
})
