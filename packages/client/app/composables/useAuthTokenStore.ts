import type { AuthTokenStore } from '../lib/authToken'
import { authTokenStore, installAuthTokenStore } from '../lib/authToken'

// The store bearer-mode clients keep the session token in. Call it once at
// startup, before any sign-in, to replace the default `localStorage`
// implementation with one backed by `@capacitor/preferences` (or a
// Keychain/Keystore plugin), which can persist across a WebView data eviction:
//
// ```ts
// import { useAuthTokenStore } from '#imports'
//
// useAuthTokenStore({
//   read: async () => (await Preferences.get({ key: 'session' })).value,
//   write: async (token) => { await Preferences.set({ key: 'session', value: token }) },
//   clear: async () => { await Preferences.remove({ key: 'session' }) },
// })
// ```
//
// Call it with no argument to read the store in use. Cookie-mode apps never
// need it: their session lives in the browser's cookie jar.

export function useAuthTokenStore(next?: AuthTokenStore): AuthTokenStore {
  if (next && !installAuthTokenStore(next)) {
    console.warn('[auth] useAuthTokenStore() was called again after setup; the existing store remains active.')
  }

  return authTokenStore()
}
