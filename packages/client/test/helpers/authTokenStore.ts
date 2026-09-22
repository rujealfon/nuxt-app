import type { AuthTokenStore } from '../../app/lib/authToken'
import { browserAuthTokenStore, resetAuthTokenStoreState } from '../../app/lib/authToken'

// In-memory AuthTokenStore for specs that need a replacement store.
export function memoryAuthTokenStore(initial: string | null = null): AuthTokenStore {
  let stored = initial

  return {
    read: async () => stored,
    write: async (token) => {
      stored = token
    },
    clear: async () => {
      stored = null
    },
  }
}

// Put the default store back and empty it, so a replacement never leaks between
// tests. Uses the internal setter rather than `useAuthTokenStore()` so it does
// not trip that function's install-once guard.
export async function resetAuthTokenStore(): Promise<void> {
  resetAuthTokenStoreState()
  await browserAuthTokenStore.clear()
}
